import BN from "bn.js";
import { dataToBN, SubstrateClient, withL2Client } from "./client";
import { L2Ops } from "./enums";
import { handler as l1SyncHandler } from "./handler/l1sync";
import { handler as eventRecorder } from "./handler/eventStorage";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getLocalEthConfig } from "delphinus-deployment/src/local/eth-config";
import { CommandOp } from "delphinus-l2-client-helper/src/swap";

const SECTION_NAME = "swapModule";

const opsMap = new Map<L2Ops, CommandOp>([
  [L2Ops.Deposit, CommandOp.Deposit],
  [L2Ops.Withdraw, CommandOp.Withdraw],
  [L2Ops.Swap, CommandOp.Swap],
  [L2Ops.PoolSupply, CommandOp.Supply],
  [L2Ops.PoolRetrieve, CommandOp.Retrieve],
  [L2Ops.AddPool, CommandOp.AddPool],
]);

export interface EventHandler {
  preHandler?: (commitedRid: BN) => Promise<void>;
  eventHandler?: (rid: string, op: CommandOp, args: any[]) => Promise<void>;
}

const l2EventHandlers = new Map<string, EventHandler>([
  ["verify", l1SyncHandler],
  ["event recorder", eventRecorder],
]);

async function handleOp(rid: string, op: CommandOp, args: any[]) {
  l2EventHandlers.forEach(async (handler, name) => {
    if (handler.eventHandler) {
      console.log("executing event handler ", name);
      await handler.eventHandler(rid, op, args);
    }
  });
}

async function handlePendingReq(kv: any[]) {
  const rid = kv[0].toString();
  const fn = (op: CommandOp, data: any[]) => handleOp(rid, op, data);

  console.log(`rid is ${rid}`);
  console.log(kv[1].value.toString());

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
    (await getLocalEthConfig(L1ClientRole.Monitor))[0].l2Account,
    async (l2Client: SubstrateClient) => {
      return await getPendingReqs(l2Client);
    }
  );

  console.log("pending req length", txList.length);
  if (txList.length === 0) {
    console.log("no pending req, exiting...");
    return;
  }

  const commitedRid = new BN(txList[0][0].toString(), 10).subn(1);

  l2EventHandlers.forEach(async (handler, name) => {
    if (handler.preHandler) {
      console.log("executing pre handler ", name);
      await handler.preHandler(commitedRid);
    }
  });

  for (const kv of txList) {
    await handlePendingReq(kv);
  }

  console.log("resolve ", txList.length, " pending reqs, exiting...");
}

main();
