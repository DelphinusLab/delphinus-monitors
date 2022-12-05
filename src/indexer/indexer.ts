import { dataToBN, SubstrateClient, withL2Client } from "../substrate/client";
import fs from "fs";
import path from "path";
import {
  eventRecorder,
  latestBlock,
  recordBlockNumber,
  clearDb,
} from "./indexStorage";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";

async function main() {
  //sync up to latest blocks, and then start listening for new events
  //get latest block stored in DB

  //clear the database and reset blocknumber,
  if (process.argv[2] === "new") {
    console.log("Clearing database collection...");
    await clearDb();
    //file removed
  }

  //read a file with the latest block number otherwise create a new file
  let lastBlock = await latestBlock();

  console.log("latestBlock in mongodb:", lastBlock);

  try {
    console.log("starting l2 indexer");
    await withL2Client(
      (
        await getEnabledEthConfigs(L1ClientRole.Monitor)
      )[0].l2Account,
      async (l2Client: SubstrateClient) => {
        let latestBlock = await l2Client.lastHeader;
        let blockToSync = lastBlock;
        for (let i = blockToSync; i <= latestBlock.number.toNumber(); i++) {
          let txs = await l2Client.syncBlockExtrinsics(i);
          if (txs.length > 0) {
            console.log("tx:", txs);
            await eventRecorder(txs); //batch record for each block, insert all txs from a block at once
          }
          await recordBlockNumber(i);
        }
      }
    );
    console.log("finished synchronising with node");
  } catch (e) {
    console.log(e);
  }

  process.exit();
}

main().catch((e) => {
  console.log(e);
  process.exit();
});
