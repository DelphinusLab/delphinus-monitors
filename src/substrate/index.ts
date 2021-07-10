import BN from "bn.js";
import substrateNode from "../../config/substrate-node.json";
import { SubstrateClient } from "./client";
import { EventQueue } from "./event-queue";
import { handleDepositEvent, handleDepositPendingOps } from "./ops/deposit";
import { sortPoolPair } from "./sort-pool-ops-info";
import { handleWithdrawEvent, handleWithdrawPendingOps } from "./ops/withdraw";
import { handleSwapEvent, handleSwapPendingOps } from "./ops/swap";
import { L2Ops } from "./enums";
import {
  handlePoolSupplyEvent,
  handlePoolSupplyPendingOps,
} from "./ops/pool-supply";
import { handlePoolRetrieveEvent } from "./ops/pool-retrieve";
import { registerBridge } from "./bridges";

const ETHConfig: any = require("solidity/clients/config");
const abi: any = require("solidity/clients/bridge/abi");
const l2address: any = require("../eth/l2address");

let bridge1: any;
let bridge2: any;

const SECTION_NAME = "swapModule";

class TransactionQueue {
  client: SubstrateClient;
  isReady: boolean = false;
  startHeader: any;
  blockQueue: EventQueue<any>;
  eventQueue: EventQueue<[string, any]>;

  constructor(_client: SubstrateClient) {
    this.client = _client;
    this.blockQueue = new EventQueue(this._handleBlock.bind(this));
    this.eventQueue = new EventQueue(this._handleEvent.bind(this));
  }

  private async _handleEvent(info: [string, any]) {
    console.log("Got event: " + info);
    const method = info[0];
    const data = info[1];

    if (Object.values(L2Ops).find((op) => op === method)) {
      const opsMap = new Map<L2Ops, (data: any[]) => Promise<void>>([
        [L2Ops.Deposit, handleDepositEvent],
        [L2Ops.Withdraw, handleWithdrawEvent],
        [L2Ops.Swap, handleSwapEvent],
        [L2Ops.PoolSupply, handlePoolSupplyEvent],
        [L2Ops.PoolRetrieve, handlePoolRetrieveEvent],
      ]);

      await opsMap.get(method as L2Ops)?.(data);
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
    `${substrateNode.host}:${substrateNode.port}`,
    15
  );
  const queue = new TransactionQueue(client);

  console.log("start");

  registerBridge("localtestnet1", await abi.getBridge(ETHConfig["localtestnet1"], false));
  registerBridge("localtestnet2", await abi.getBridge(ETHConfig["localtestnet2"], false));

  console.log("getBridge");

  await client.init();
  await client.subscribe((header) => queue.handleBlock(header));

  const txMap = await client.getPendingReqMap();
  const txList = Array.from(txMap.entries())
    .map((kv: any) => [new BN(kv[0].replace("0x", "")), kv[1]])
    .sort((kv1: any, kv2: any) => kv1[0] - kv2[0]);

  console.log(txList.length);

  for (const kv of txList) {
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
      await handlePoolSupplyPendingOps(rid, kv[1].value.asPoolRetrieve);
    }
  }

  queue.setStartHeader(client.lastHeader);
}

main();
