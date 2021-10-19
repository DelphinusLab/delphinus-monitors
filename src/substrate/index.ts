import BN from "bn.js";
import substrateNode from "../../config/substrate-node.json";
import { SubstrateClient } from "./client";
import { EventQueue } from "./event-queue";
import { L2Ops } from "./enums";
import { CommandOp, L2Storage } from "delphinus-zkp/src/business/command";
import { runZkp } from "delphinus-zkp/src/business/main";
import { Field } from "delphinus-curves/src/field";
import { bridgeInfos, registerBridge } from "./bridges";

const MonitorETHConfig: any = require("../../config/eth-config.json");
const ETHConfig: any = require("solidity/clients/config");
const abi: any = require("solidity/clients/bridge/abi");

const SECTION_NAME = "swapModule";

async function loadL2Storage() {
  return new L2Storage();
}

export function dataToBN(data: any) {
  if (data.toHex) {
    data = data.toHex();
  }
  return new BN(data.replace(/0x/, ""), 16);
}

const opsMap = new Map<L2Ops, CommandOp>([
  [L2Ops.Deposit, CommandOp.Deposit],
  [L2Ops.Withdraw, CommandOp.Withdraw],
  [L2Ops.Swap, CommandOp.Swap],
  [L2Ops.PoolSupply, CommandOp.Supply],
  [L2Ops.PoolRetrieve, CommandOp.Retrieve],
  [L2Ops.AddPool, CommandOp.AddPool],
]);

async function verify(
  bridge: any,
  l2Account: string,
  command: BN[],
  proof: BN[],
  rid: BN,
  vid: number = 0
) {
  console.log("start to send to:", bridge.chain_hex_id);
  while (true) {
    let txhash = "";
    try {
      let metadata = await bridge.getMetaData();
      if ((new BN(metadata.bridgeInfo.rid)).gte(rid)) {
        return;
      }

      let tx = bridge.verify(0, command, proof, vid, 0, rid);
      let r = await tx.when("Verify", "transactionHash", (hash: string) => {
        console.log("Get transactionHash", hash);
        txhash = hash;
      });
      console.log("done", r.blockHash);
      return r;
    } catch (e: any) {
      if (txhash !== "") {
        console.log("exception with transactionHash ready", " will retry ...");
        console.log("exception with transactionHash ready", " will retry ...");
        throw e;
      } else {
        if (e.message == "ESOCKETTIMEDOUT") {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else if (e.message == "nonce too low") {
          console.log("failed on:", bridge.chain_hex_id, e.message); // not sure
          return;
        } else {
          console.log("Unhandled exception during verify");
          console.log(e);
          throw e;
        }
      }
    }
  }
}

async function handleOp(
  rid: string,
  storage: L2Storage,
  op: CommandOp,
  args: any[]
) {
  await storage.startSnapshot(rid);

  const proof = await runZkp(
    new Field(op),
    args.map((x) => new Field(dataToBN(x))),
    storage
  );

  console.log(proof);

  const commandBuffer = [new BN(op)].concat(
    // Fill padding to 8
    args.concat(Array(8).fill(new BN(0))).slice(0, 8)
  );

  const proofBuffer = proof.map(dataToBN);

  console.log("----- verify args -----");
  console.log(commandBuffer);
  console.log(proofBuffer);
  console.log("----- verify args -----");

  for (const bridgeInfo of bridgeInfos) {
    await verify(
      bridgeInfo.bridge,
      "0",
      commandBuffer,
      proofBuffer,
      dataToBN(rid)
    );
  }

  console.log("before end snapshot", rid);
  await storage.endSnapshot();
  console.log("after end snapshot", rid);
}

async function handleEvent(storage: L2Storage, op: CommandOp, data: any[]) {
  return handleOp(data[0], storage, op, data.slice(1));
}

async function handlePendingReq(kv: any[], storage: L2Storage) {
  console.log(kv[1].value.toString());
  const rid = kv[0].toString();
  console.log(`rid is ${rid}`);

  const fn = (op: CommandOp, data: any[]) => handleOp(rid, storage, op, data);

  if (kv[1].value.isWithdraw) {
    await fn(CommandOp.Withdraw, kv[1].value.asWithdraw);
  } else if (kv[1].value.isDeposit) {
    await fn(CommandOp.Deposit, kv[1].value.asDeposit);
  } else if (kv[1].value.isSwap) {
    await fn(CommandOp.Swap, kv[1].value.asSwap);
  } else if (kv[1].value.isPoolSupply) {
    await fn(CommandOp.Supply, kv[1].value.asPoolSupply);
  } else if (kv[1].value.isPoolRetrieve) {
    await fn(CommandOp.Retrieve, kv[1].value.asPoolRetrieve);
  } else if (kv[1].value.isAddPool) {
    await fn(CommandOp.AddPool, kv[1].value.asAddPool);
  } else {
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

    let op = opsMap.get(method as L2Ops);
    if (op !== undefined) {
      await handleEvent(this.storage, op, data);
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
    `${substrateNode["host"]}:${substrateNode.port}`
  );

  const storage = await loadL2Storage();
  const queue = new TransactionQueue(client, storage);

  for (let config of MonitorETHConfig.filter((config: any) => config.enable)) {
    const bridge = await abi.getBridge(ETHConfig[config.chainName], false);
    registerBridge(config.chainName, bridge);
  }

  console.log("getBridge");

  await client.init();
  await client.subscribe((header) => queue.handleBlock(header));

  const txMap = await client.getPendingReqMap();
  const txList = Array.from(txMap.entries())
    .map((kv: any) => [dataToBN(kv[0]), kv[1]])
    .sort((kv1: any, kv2: any) => kv1[0] - kv2[0]);

  console.log(txList.length);

  const commitedRid =
    txList.length === 0
    ? dataToBN((await (await client.getAPI()).query.swapModule.reqIndex()))
    : dataToBN(txList[0][0]).subn(1);

  console.log("checkout db snapshot to", commitedRid.toString(10));
  storage.loadSnapshot(commitedRid.toString(10));

  for (const kv of txList) {
    await handlePendingReq(kv, storage);
  }

  queue.setStartHeader(client.lastHeader);
}

main();
