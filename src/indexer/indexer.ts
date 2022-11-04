import BN from "bn.js";
import { dataToBN, SubstrateClient, withL2Client } from "../substrate/client";

import { eventRecorder, latestDbTx, clearDb } from "./indexStorage";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { CommandOp } from "delphinus-l2-client-helper/src/swap";
import { ExtrinsicSuccess, ExtrinsicFail } from "./types";

async function main() {
  //sync up to latest blocks, and then start listening for new events
  //get latest block stored in DB
  await clearDb(); //Use this to drop the collection (for testing)
  //issue is if there are no transactions for while, it will resync from latest tx not latest block
  //so perhaps store latest block or just record all blocks regardless of TX
  let lastEntry = await latestDbTx();
  console.log("latestBlock in DB:", lastEntry);

  try {
    console.log("starting l2 indexer");
    await withL2Client(
      (
        await getEnabledEthConfigs(L1ClientRole.Monitor)
      )[0].l2Account,
      async (l2Client: SubstrateClient) => {
        let latestBlock = await l2Client.lastHeader;
        let blockToSync = lastEntry!.length > 0 ? lastEntry![0].blockNumber : 1;
        for (let i = blockToSync; i <= latestBlock.number.toNumber(); i++) {
          let txs = await l2Client.syncBlockExtrinsics(i);
          console.log("tx:", txs);
          if (txs.length > 0) await eventRecorder(txs); //batch record for each block, insert all txs from a block at once
        }
      }
    );
    console.log("finished synchronising with node");
  } catch (e) {
    console.log(e);
  }

  process.exit();
}

main();
