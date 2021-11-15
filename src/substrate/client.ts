import BN from "bn.js";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/api";
import { AddressOrPair } from "@polkadot/api/types";
import { cryptoWaitReady } from "@polkadot/util-crypto";

import { EthConfigEnabled, SubstrateNodeConfig } from "delphinus-deployment/src/config";
import * as types from "./types.json";

const ss58 = require("substrate-ss58");

const hexstr2bn = (hexstr: string) => {
  console.assert(hexstr.substring(0, 2) == "0x");
  let r = new BN(hexstr.substring(2), "hex");
  return r;
};

export class SubstrateClient {
  provider: WsProvider;
  api?: ApiPromise;
  sudo?: AddressOrPair;
  lastHeader?: any;
  nonce?: BN;
  lock: boolean = false;
  idx?: number;

  constructor(addr: string, idx?: number) {
    this.provider = new WsProvider(addr);
    this.idx = idx;
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

  public async getSudo() {
    if (!this.sudo) {
      await cryptoWaitReady();
      const keyring = new Keyring({ type: "sr25519" });
      this.sudo = keyring.addFromUri(
        EthConfigEnabled.filter((config) => config.device_id === this.idx?.toString())[0]
          ?.l2_account!
      );
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

  public async send(method: string, ...args: any[]) {
    console.log("send " + method);

    const api = await this.getAPI();
    const sudo = await this.getSudo();
    const tx = api.tx.swapModule[method](...args);

    if (this.nonce === undefined) {
      this.nonce = new BN(
        (await api.query.system.account((sudo as any).address)).nonce.toNumber()
      );
    }

    const nonce = this.nonce;
    this.nonce = nonce.addn(1);

    console.log("current nonce in send:", nonce);
    await tx.signAndSend(sudo, { nonce });
  }

  public async ack(id: string) {
    return this.send("ack", id);
  }

  public async deposit(
    account: string,
    token_addr: string = "0",
    amount: string = "0",
    hash: string = "0x0"
  ) {
    const api = await this.getAPI();
    const sudo = await this.getSudo();
    const accountId = ss58.addressToAddressId((sudo as any).address);
    const l2nonce = await api.query.swapModule.nonceMap(accountId);
    return this.send(
      "deposit",
      account,
      new BN(token_addr),
      new BN(amount),
      l2nonce,
      hexstr2bn(hash)
    );
  }

  public async charge(account: string, amount: string = "0") {
    const api = await this.getAPI();
    const sudo = await this.getSudo();
    const accountId = ss58.addressToAddressId((sudo as any).address);
    return this.send("charge", account, new BN(amount));
  }

  public async getPendingReqMap() {
    const api = await this.getAPI();
    const rawMap = await api.query.swapModule.pendingReqMap.entriesAt(
      this.lastHeader.hash
    );
    const map = new Map(rawMap.map((kv) => [kv[0].args[0].toHex(), kv[1]]));
    return map;
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

  public async close() {
    const api = await this.getAPI();
    await api.disconnect();
  }
}

export async function withL2Client<t>(
  chainIdx: number | undefined,
  cb: (l2Client: SubstrateClient) => Promise<t>
): Promise<t> {
  let addr = `${SubstrateNodeConfig.address}:${SubstrateNodeConfig.port}`;
  let l2Client = new SubstrateClient(addr, chainIdx);
  await l2Client.init();
  try {
    return await cb(l2Client);
  } finally {
    await l2Client.close();
  }
}
