import BN from "bn.js";
import { dataToBN, SubstrateClient, withL2Client } from "./client";
import { L2Ops } from "./enums";
import { handler as l1SyncHandler } from "./handler/l1sync";
import { handler as eventRecorder } from "./handler/eventStorage";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { CommandOp } from "delphinus-l2-client-helper/src/swap";
import { handleReq } from "./swapUtils";

import { sendAlert } from "delphinus-slack-alert/src/index";
const SlackConfig = require("../../slack-alert-config.json");

export interface EventHandler {
  preHandler?: (commitedRid: BN) => Promise<void>;
  eventHandler?: (rid: string, op: CommandOp, args: any[]) => Promise<void>;
}

const l2EventHandlers = new Map<string, EventHandler>([
  ["verify", l1SyncHandler],
  ["event recorder", eventRecorder],
]);

async function handleOp(rid: string, op: CommandOp, args: any[]) {
  for (let eh of l2EventHandlers) {
    let name = eh[0];
    let handler = eh[1];
    if (handler.eventHandler) {
      console.log("executing event handler ", name);
      await handler.eventHandler(rid, op, args);
    }
  };
}

async function main() {
  try {
    let txList = await withL2Client(
      (await getEnabledEthConfigs(L1ClientRole.Monitor))[0].l2Account,
      async (l2Client: SubstrateClient) => {
        return await l2Client.getPendingReqs();
      }
    );

    let compTxList = await withL2Client(
      (await getEnabledEthConfigs(L1ClientRole.Monitor))[0].l2Account,
      async (l2Client: SubstrateClient) => {
        return await l2Client.getCompleteReqs();
      }
    );

    let ackList = await withL2Client(
      (await getEnabledEthConfigs(L1ClientRole.Monitor))[0].l2Account,
      async (l2Client: SubstrateClient) => {
        return await l2Client.getAcks();
      }
    );

    let cLength = compTxList.length;
    let tLength = txList.length;
    if(tLength != 0) {
      console.log("pending reqs length", tLength + ", tx is:" + Number(cLength+1) + "-" + Number(cLength + tLength));

      if(process.argv[2] == "v") {
        console.log("\n----- pending reqs -----\n");
        for (const kv of txList) {
          console.log("req id:", kv[0].toString(10));
          console.log("op:", JSON.stringify(kv[1], null, 2), "\n");
        }
        console.log("----- pending reqs -----\n");
      }
    } else {
      console.log("pending reqs length", tLength);
    }

    if(cLength != 0) {
      console.log("completed reqs length" + cLength + ", tx is: 1-" + cLength);
    } else {
      console.log("completed reqs length", cLength);
    }

    if (tLength === 0) {
      console.log("no pending req, exiting...");
      return;
    }

    const commitedRid = new BN(txList[0][0].toString(), 10).subn(1);

    for (let eh of l2EventHandlers) {
      let name = eh[0];
      let handler = eh[1];
      if (handler.preHandler) {
        console.log("executing pre handler ", name);
        await handler.preHandler(commitedRid);
      }
    };

    let ackString = JSON.stringify(ackList);
    let ackTargetString;
    let ackBitsArr;
    let ackBits;
    let ridBase10;
    let rid;
    for (const kv of txList) {
      ridBase10 = kv[0].toString(10);
      rid = JSON.stringify(kv[0]);
      if(ackString.indexOf(rid) != -1) {
        ackTargetString = ackString.substr(ackString.indexOf(rid) + rid.length);
        if(ackTargetString) {
          ackBitsArr = /\"(.+?)\"/.exec(ackTargetString);
          if(ackBitsArr) {
            ackBits = parseInt(ackBitsArr[1]).toString(2).padStart(4, "0");
          }
        }
        console.log(`rid is ${ridBase10}, ack_bits: ${ackBits}`);
      } else {
        console.log(`rid is ${ridBase10}`);
      }
      await handleReq(kv, handleOp);
    }

    console.log("resolve ", txList.length, " pending reqs, exiting...");
  } catch(e) {
    await sendAlert(e, SlackConfig, true);
  }

  process.exit();
}

main();
