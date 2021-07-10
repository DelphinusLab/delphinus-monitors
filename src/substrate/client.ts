import BN from "bn.js";

import * as types from "./types.json";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/api";
import { AddressOrPair } from "@polkadot/api/types";
import { cryptoWaitReady } from "@polkadot/util-crypto";

const ss58 = require("substrate-ss58");
const MonitorETHConfig = require("../../config/eth-config.json");

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
        MonitorETHConfig.fitler((config: any) => config.chainId === this.idx)[0]
          ?.L2account || "//Bob"
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
    const api = await this.getAPI();
    const sudo = await this.getSudo();
    const tx = api.tx.swapModule[method](...args);

    if (this.nonce === undefined) {
      this.nonce = new BN(
        (await api.query.system.account((sudo as any).address)).nonce
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
    amount: string = "0"
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
      l2nonce
    );
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
}
