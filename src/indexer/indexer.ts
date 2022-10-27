import BN from "bn.js";
import { dataToBN, SubstrateClient, withL2Client } from "../substrate/client";

import { handler as eventRecorder } from "./indexStorage";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { CommandOp } from "delphinus-l2-client-helper/src/swap";

export interface EventHandler {
  preHandler?: (commitedRid: BN) => Promise<void>;
  eventHandler?: (rid: string, op: CommandOp, args: any[]) => Promise<void>;
}

const l2EventHandlers = new Map<string, EventHandler>([
  ["event recorder", eventRecorder],
]);

async function main() {
  //sync up to latest blocks, and then start listening for new events

  try {
    console.log("starting l2 indexer");

    await withL2Client(
      (
        await getEnabledEthConfigs(L1ClientRole.Monitor)
      )[0].l2Account,
      async (l2Client: SubstrateClient) => {
        return await l2Client.syncAllExtrinsics();
      }
    );
  } catch (e) {
    console.log(e);
  }

  process.exit();
}

main();
