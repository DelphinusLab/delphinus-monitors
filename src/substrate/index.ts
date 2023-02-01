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
const SlackConfig = require("delphinus-slack-alert/src/sendToSlackTool/slack-alert-config.json");
const AccountConfig = require("delphinus-deployment/config/substrate-account-config.json");
require('console-stamp')(console, {format: ':date(yyyy/mm/dd HH:MM:ss)'});

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

    // for example, ackList: [["01","0x0f"],["02","0x0f"],["03","0x0f"],["04","0x0f"],["05","0x0f"],["06","0x0f"],["07","0x0f"],["08","0x0f"],["09","0x0f"],["0a","0x0f"]]
    // ack_bits: Convert hex(0x0f) to binary(1111). If the number is less than 4, add 0 on the left to make a string of length 4
    // Refer to "secret_key_uri" in "deployment/config/substrate-account-config.json" for what does each bit of ack_bits represent. For example, if ack_bits is 0001, the first seed in "secret_key_uri" is "//Smith". Find "Smith" in "deployment/config/eth-config.ts". You can find corresponding chainName.
    let ackArr;
    let ackBits;
    let rid;
    console.log("accounts corresponding to ack_bits:", AccountConfig["secret_key_uri"].reverse());
    for (const kv of txList) {
      rid = kv[0].toString(10);
      let ackArr = ackList.filter(function(arr){
          return arr[0].eq(kv[0]);
      });
      if(ackArr.length != 0) {
        // for example, if ackArr is ["0a", "0x3"], ackBits is "0011"
        ackBits = parseInt(ackArr[0][1].toString()).toString(2).padStart(4, "0");
        console.log(`rid is ${rid}, ack_bits: ${ackBits}`);
      } else {
        console.log(`rid is ${rid}`);
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
