import BN from "bn.js";
import { dataToBN, SubstrateClient, withL2Client } from "../substrate/client";

import { eventRecorder, latestDbTx } from "./indexStorage";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { CommandOp } from "delphinus-l2-client-helper/src/swap";
import { ExtrinsicSuccess, ExtrinsicFail } from "./indexStorage";

async function main() {
  //sync up to latest blocks, and then start listening for new events
  //get latest block stored in DB
  let lastEntry = await latestDbTx();
  console.log("latestBlock:", lastEntry);

  try {
    console.log("starting l2 indexer");
    let tx = (await withL2Client(
      (
        await getEnabledEthConfigs(L1ClientRole.Monitor)
      )[0].l2Account,
      async (l2Client: SubstrateClient) => {
        let latestBlock = await l2Client.lastHeader;
        console.log("latest block:", latestBlock.number.toString());
        return await l2Client.syncBlockExtrinsics(latestBlock.number);
      }
    )) as ExtrinsicFail | ExtrinsicSuccess | undefined;
    console.log("tx:", tx);
    if (tx) await eventRecorder(tx);
  } catch (e) {
    console.log(e);
  }

  process.exit();
}

main();
