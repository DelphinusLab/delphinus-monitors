import BN from "bn.js";
import substrateNode from "../../config/substrate-node.json";
import { SubstrateClient } from "./client";
import { EventQueue } from "./event-queue";
import { handleDepositEvent, handleDepositPendingOps } from "./ops/deposit";
import { handleWithdrawEvent, handleWithdrawPendingOps } from "./ops/withdraw";
import { handleSwapEvent, handleSwapPendingOps } from "./ops/swap";
import { L2Ops } from "./enums";
import {
  handlePoolSupplyEvent,
  handlePoolSupplyPendingOps,
} from "./ops/pool-supply";
import { handlePoolRetrieveEvent, handlePoolRetrievePendingOps } from "./ops/pool-retrieve";
import { registerBridge } from "./bridges";
import { L2Storage } from "delphinus-zkp/src/business/command";
import { handleAddTokenEvent, handleAddTokenPendingOps } from "./ops/add-token";
import { handleAddPoolEvent } from "./ops/add-pool";

const MonitorETHConfig: any = require("../../config/eth-config.json");
const ETHConfig: any = require("solidity/clients/config");
const abi: any = require("solidity/clients/bridge/abi");

const SECTION_NAME = "swapModule";

async function loadL2Storage() {
  return new L2Storage;
}

const opsMap = new Map<L2Ops, (data: any[], storage: L2Storage) => Promise<void>>([
  [L2Ops.Deposit, handleDepositEvent],
  [L2Ops.Withdraw, handleWithdrawEvent],
  [L2Ops.Swap, handleSwapEvent],
  [L2Ops.PoolSupply, handlePoolSupplyEvent],
  [L2Ops.PoolRetrieve, handlePoolRetrieveEvent],
  [L2Ops.AddPool, handleAddPoolEvent],
  [L2Ops.AddToken, handleAddTokenEvent],
]);

async function handlePendingReq(kv: any[], storage: L2Storage) {
  console.log(kv[1].value.toString());
  const rid = kv[0].toString();
  console.log(`rid is ${rid}`);

  if (kv[1].value.isWithdraw) {
    await handleWithdrawPendingOps(rid, kv[1].value.asWithdraw);
  } else if (kv[1].value.isDeposit) {
    await handleDepositPendingOps(rid, kv[1].value.asDeposit);
  } else if (kv[1].value.isSwap) {
    await handleSwapPendingOps(rid, kv[1].value.asSwap);
  } else if (kv[1].value.isPoolSupply) {
    await handlePoolSupplyPendingOps(rid, kv[1].value.asPoolSupply);
  } else if (kv[1].value.isPoolRetrieve) {
    await handlePoolRetrievePendingOps(rid, kv[1].value.asPoolRetrieve);
  } else if (kv[1].value.isAddToken) {
    await handleAddTokenPendingOps(rid, kv[1].value.asAddToken, storage);
  }  else {
    console.log(kv[1].value);
  }
}

class TransactionQueue {
  client: SubstrateClient;
  isReady: boolean = false;
  startHeader: any;
  blockQueue: EventQueue<any>;
  eventQueue: EventQueue<[string, any]>;
  storage: L2Storage;

  constructor(_client: SubstrateClient, storage: L2Storage) {
    this.client = _client;
    this.blockQueue = new EventQueue(this._handleBlock.bind(this));
    this.eventQueue = new EventQueue(this._handleEvent.bind(this));
    this.storage = storage;
  }

  private async _handleEvent(info: [string, any]) {
    console.log("Got event: " + info);
    const method = info[0];
    const data = info[1];

    if (Object.values(L2Ops).find((op) => op === method)) {
      await opsMap.get(method as L2Ops)?.(data, this.storage);
    }
  }

  private async _handleBlock(header: any) {
    if (header.number > this.startHeader.number) {
      const events = await this.client.getEvents(header);
      events
        .filter((e: any) => e.event.section === SECTION_NAME)
        .forEach((e: any) => {
          this.eventQueue.push([e.event.method, e.event.data]);
        });
    }
  }

  public async handleBlock(header: any) {
    this.blockQueue.push(header, this.isReady);
  }

  public async setStartHeader(header: any) {
    this.startHeader = header;
    this.isReady = true;
    this.blockQueue.push(undefined, this.isReady);
  }
}

async function main() {
  const client = new SubstrateClient(
    `${substrateNode["host-local"]}:${substrateNode.port}`
  );

  const storage = await loadL2Storage();
  const queue = new TransactionQueue(client, storage);

  for (let config of MonitorETHConfig.filter((config: any) => config.enable)) {
    //registerBridge(
    //  config.name,
    //  await abi.getBridge(ETHConfig[config.chainName], false)
    //);
  }

  console.log("getBridge");

  await client.init();
  await client.subscribe((header) => queue.handleBlock(header));

  const txMap = await client.getPendingReqMap();
  const txList = Array.from(txMap.entries())
    .map((kv: any) => [new BN(kv[0].replace("0x", "")), kv[1]])
    .sort((kv1: any, kv2: any) => kv1[0] - kv2[0]);

  console.log(txList.length);

  for (const kv of txList) {
    await handlePendingReq(kv, storage);
  }

  queue.setStartHeader(client.lastHeader);
}

main();
