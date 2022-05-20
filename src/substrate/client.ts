import BN from "bn.js";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/api";
import { IKeyringPair } from "@polkadot/types/types";
import { cryptoWaitReady } from "@polkadot/util-crypto";

import { getSubstrateNodeConfig } from "delphinus-deployment/src/config";
import { SwapHelper } from "delphinus-l2-client-helper/src/swap";

import * as types from "delphinus-l2-client-helper/src/swap-types.json";
import * as DelphinusCrypto from "delphinus-crypto/node/pkg/delphinus_crypto";

const ss58 = require("substrate-ss58");

const hexstr2bn = (hexstr: string) => {
  console.assert(hexstr.substring(0, 2) == "0x");
  let r = new BN(hexstr.substring(2), "hex");
  return r;
};

export function dataToBN(data: any) {
  if (data.toHex) {
    data = data.toHex();
  }
  return new BN(data.replace(/0x/, ""), 16);
}

export class SubstrateQueryClient {
  provider: WsProvider;
  api?: ApiPromise;

  constructor(addr: string) {
    this.provider = new WsProvider(addr);
  }

  public async getAPI() {
    if (!this.api || !this.api.isConnected) {
      this.api = await ApiPromise.create({
        provider: this.provider,
        types: types,
      });
    }
    return this.api;
  }

  public async close() {
    const api = await this.getAPI();
    await api.disconnect();
  }

  public async getCompleteReqMap() {
    const api = await this.getAPI();
    const rawMap = await api.query.swapModule.completeReqMap.entries();
    const map = new Map(rawMap.map((kv) => [kv[0].args[0].toHex(), kv[1]]));
    return map;
  }

  public async getCompleteReqs() {
    const txMap = await this.getCompleteReqMap();
    return Array.from(txMap.entries())
      .map((kv) => [dataToBN(kv[0]), kv[1]] as [BN, any])
      .sort((kv1, kv2) => kv1[0].sub(kv2[0]).isNeg() ? -1 : 1);
  }
}

export class SubstrateClient extends SubstrateQueryClient {
  static nonce: Map<string, BN> = new Map();
  swapHelper: SwapHelper<void>;
  sudo?: IKeyringPair;
  lastHeader?: any;
  lock: boolean = false;
  account: string;

  constructor(addr: string, account: string, sync = true) {
    super(addr);
    const s = sync ? this.sendUntilFinalize.bind(this) : this.send.bind(this);
    this.swapHelper = new SwapHelper(account, s, DelphinusCrypto);
    this.account = account;
  }

  public async getSudo() {
    if (!this.sudo) {
      await cryptoWaitReady();
      const keyring = new Keyring({ type: "sr25519" });
      this.sudo = keyring.addFromUri(this.account);
      console.log("sudo is " + this.sudo.address);
      console.log("sudo Id is " + ss58.addressToAddressId(this.sudo.address));
    }

    return this.sudo;
  }

  public async init() {
    const api = await this.getAPI();
    if (!this.lastHeader) {
      this.lastHeader = await api.rpc.chain.getHeader();
    }
  }

  async getNonce() {
    const api = await this.getAPI();
    const sudo = await this.getSudo();

    if (SubstrateClient.nonce.get(this.account) === undefined) {
      SubstrateClient.nonce.set(this.account, new BN(
        (await api.query.system.account((sudo as any).address)).nonce.toNumber()
      ));
    }

    const nonce = SubstrateClient.nonce.get(this.account)!;
    SubstrateClient.nonce.set(this.account, nonce.addn(1));

    return nonce;
  }

  public async send(method: string, ...args: any[]) {
    console.log("send " + method);
    const api = await this.getAPI();
    const sudo = await this.getSudo();
    const tx = api.tx.swapModule[method](...args);
    const nonce = await this.getNonce();

    console.log("current nonce in send:", nonce);
    await tx.signAndSend(sudo, { nonce });
  }

  public async sendUntilFinalize(method: string, ...args: any[]) {
    console.log("sendUntilFinalize " + method);
    const api = await this.getAPI();
    const sudo = await this.getSudo();
    const tx = api.tx.swapModule[method](...args);
    const nonce = await this.getNonce();

    console.log("current nonce in send:", nonce);
    await new Promise(async (resolve, reject) => {
      // TODO: handle error events
      const unsub = await tx.signAndSend(sudo, { nonce }, ({ events = [], status }) => {
        if (status.isFinalized) {
          events.forEach(({ phase, event: { data, method, section } }) => {
            console.log(`\t' ${phase}: ${section}.${method}:: ${data}`);
          });
          unsub();
          resolve(undefined);
        }
      });
    });
  }

  public async ack(id: string) {
    return this.send("ack", id);
  }

  public async deposit(
    account: string,
    tokenIndex: string,
    amount: string,
    hash: string
  ) {
    const api = await this.getAPI();
    const sudo = await this.getSudo();
    const accountId = ss58.addressToAddressId((sudo as any).address);
    const accountIndexOpt: any = await api.query.swapModule.accountIndexMap(account);
    const l2nonce = await api.query.swapModule.nonceMap(accountId);

    if (accountIndexOpt.isNone) {
      console.log("Invalid user");
      return;
    }

    const accountIndex = accountIndexOpt.value;

    return await this.swapHelper.deposit(
      hexstr2bn(accountIndex.toHex()),
      new BN(tokenIndex, 10),
      new BN(amount, 10),
      hexstr2bn(hash),
      hexstr2bn(l2nonce.toHex())
    );
  }

  public async charge(account: string, amount: string = "0", hash: string) {
    const api = await this.getAPI();
    const sudo = await this.getSudo();
    const accountId = ss58.addressToAddressId((sudo as any).address);
    return this.send("charge", account, new BN(amount), hexstr2bn(hash));
  }

  public async getPendingReqMap() {
    const api = await this.getAPI();
    const rawMap = await api.query.swapModule.pendingReqMap.entriesAt(
      this.lastHeader.hash
    );
    const map = new Map(rawMap.map((kv) => [kv[0].args[0].toHex(), kv[1]]));
    return map;
  }

  public async getPendingReqs() {
    const txMap = await this.getPendingReqMap();
    return Array.from(txMap.entries())
      .map((kv) => [dataToBN(kv[0]), kv[1]] as [BN, any])
      .sort((kv1, kv2) => kv1[0].sub(kv2[0]).isNeg() ? -1 : 1);
  }


  public async getCompleteReqMap() {
    const api = await this.getAPI();
    const rawMap = await api.query.swapModule.completeReqMap.entriesAt(
      this.lastHeader.hash
    );
    const map = new Map(rawMap.map((kv) => [kv[0].args[0].toHex(), kv[1]]));
    return map;
  }

  public async getCompleteReqs() {
    const txMap = await this.getCompleteReqMap();
    return Array.from(txMap.entries())
      .map((kv) => [dataToBN(kv[0]), kv[1]] as [BN, any])
      .sort((kv1, kv2) => kv1[0].sub(kv2[0]).isNeg() ? -1 : 1);
  }


  public async getEvents(header: any) {
    const api = await this.getAPI();
    const events = await api.query.system.events.at(header.hash);
    return events;
  }

  public async subscribe(cb: (header: any) => void) {
    const api = await this.getAPI();
    await api.rpc.chain.subscribeNewHeads((header) => {
      cb(header);
    });
  }

  public async getCompleteReqIndex() {
    const api = await this.getAPI();
    const complete_reqidx = await api.query.swapModule.completeReqIndex();
    return complete_reqidx;
  }
}

export async function withL2Client<T>(
  account: string,
  cb: (l2Client: SubstrateClient) => Promise<T>,
  sync = false
): Promise<T> {
  let substrateNodeConfig = await getSubstrateNodeConfig();
  let addr = `${substrateNodeConfig.address}:${substrateNodeConfig.port}`;
  let l2Client = new SubstrateClient(addr, account, sync);
  await l2Client.init();
  try {
    return await cb(l2Client);
  } finally {
    await l2Client.close();
  }
}

export async function withL2QueryClient<T>(
  cb: (l2Client: SubstrateQueryClient) => Promise<T>
): Promise<T> {
  let substrateNodeConfig = await getSubstrateNodeConfig();
  let addr = `${substrateNodeConfig.address}:${substrateNodeConfig.port}`;
  let l2Client = new SubstrateQueryClient(addr);
  try {
    return await cb(l2Client);
  } finally {
    await l2Client.close();
  }
}
