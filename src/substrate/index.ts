import BN from "bn.js";
import substrateNode from "../../config/substrate-node.json";
import { SubstrateClient, withL2Client } from "./client";
import { L2Ops } from "./enums";
import { CommandOp, L2Storage } from "delphinus-zkp/src/zokrates/command";
import { runZkp } from "delphinus-zkp/src/zokrates/main";
import { Field } from "delphinus-curves/src/field";
import { withBridgeClient, Bridge } from "solidity/clients/bridge/bridge";
import { EthConfig } from "solidity/clients/config";

const MonitorETHConfig: any = require("../../config/eth-config.json");
/* We should using local secrets instead of debuggin secrets */
const Secrets: any = require("solidity/.secrets.json");

const SECTION_NAME = "swapModule";

async function withL2Storage<t>(cb: (_: L2Storage) => Promise<t>) {
  let l2Storage = new L2Storage();

  try {
    return await cb(l2Storage);
  } finally {
    await l2Storage.closeDb();
  }
}

async function foreachL1Bridge<t>(
  configs: any[],
  cb: (bridge: Bridge) => Promise<t>
) {
  configs.forEach(
    async (config: any) =>
      await withBridgeClient(EthConfig[config.chainName](Secrets), false, cb)
  );
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
  bridge: Bridge,
  l2Account: string,
  command: BN[],
  proof: BN[],
  rid: BN,
  vid: number = 0
) {
  console.log("start to send to:", bridge.getChainIdHex());
  while (true) {
    let txhash = "";
    try {
      let metadata = await bridge.getMetaData();
      if (new BN(metadata.bridgeInfo.rid).gte(rid)) {
        return;
      }

      /**
       * TODO: The exception behavior (e.g. network delay) will cause
       * the following statement to be executed multiple times,
       * thus consuming additional gas fee.
       *
       * We may introduce a db to filter out extra invoking.
       * 1. save (rid, txhash) into db
       * 2. check if the rid exists in the db
       * 3. get hash from db, and check if it is pending in eth
       */
      let tx = bridge.verify("0", command, proof, vid, 0, rid);
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
          console.log("failed on:", bridge.getChainIdHex(), e.message); // not sure
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

  /**
   * TODO: we can save proof in the filesystem, thus
   * recover interrupted rid can skip generating proof.
   */
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

  foreachL1Bridge(
    MonitorETHConfig.filter((config: any) => config.enable),
    async (bridge: Bridge) => {
      await verify(bridge, "", commandBuffer, proofBuffer, new BN(rid, 10));
    }
  );

  console.log("before end snapshot", rid);
  await storage.endSnapshot();
  console.log("after end snapshot", rid);
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

async function getPendingReqs(client: SubstrateClient) {
  /* transactions that havn't receive ack. */
  const txMap = await client.getPendingReqMap();
  return Array.from(txMap.entries())
    .map((kv: any) => [dataToBN(kv[0]), kv[1]])
    .sort((kv1: any, kv2: any) => kv1[0] - kv2[0]);
}

async function main() {
  let txList = await withL2Client(
    `${substrateNode["host"]}:${substrateNode.port}`,
    async (l2Client: SubstrateClient) => {
      return await getPendingReqs(l2Client);
    },
    undefined
  );

  console.log("pending req length", txList.length);
  if (txList.length === 0) {
    console.log("no pending req, exiting...");
    return;
  }

  const commitedRid = new BN(txList[0][0].toString(), 10).subn(1);

  withL2Storage(async (storage: L2Storage) => {
    console.log("checkout db snapshot to", commitedRid.toString(10));
    await storage.loadSnapshot(commitedRid.toString(10));

    for (const kv of txList) {
      await handlePendingReq(kv, storage);
    }
  });

  console.log("resolve ", txList.length, " pending reqs, exiting...");
}

main();
