import { dataToBN, SubstrateClient, withL2Client } from "../substrate/client";
import fs from "fs";
import path from "path";
import { eventRecorder, latestDbTx, clearDb } from "./indexStorage";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";

async function main() {
  //sync up to latest blocks, and then start listening for new events
  //get latest block stored in DB

  //clear the database,
  let blockFilePath = path.join(__dirname, "lastBlock.txt");
  if (process.argv[2] === "new") {
    console.log("Clearing database collection...");
    await clearDb();
    fs.unlinkSync(blockFilePath);
    //file removed
  }

  //read a file with the latest block number otherwise create a new file
  let lastBlock = 1;
  if (fs.existsSync(blockFilePath)) {
    lastBlock = parseInt(fs.readFileSync(blockFilePath).toString());
  } else {
    fs.writeFileSync(blockFilePath, "1");
  }
  console.log("latestBlock in file:", lastBlock);

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
          fs.writeFileSync(blockFilePath, i.toString());
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
