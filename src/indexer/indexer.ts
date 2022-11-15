import { dataToBN, SubstrateClient, withL2Client } from "../substrate/client";
import fs from "fs";
import { eventRecorder, latestDbTx, clearDb } from "./indexStorage";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";

async function main() {
  //sync up to latest blocks, and then start listening for new events
  //get latest block stored in DB

  //clear the database,
  if (process.argv[2] === "new") {
    await clearDb();
    fs.unlink("./lastBlock.txt", () => {});
  }

  let lastEntry = await latestDbTx();
  console.log("latestTransaction in DB:", lastEntry);
  //read a file with the latest block number otherwise create a new file
  let lastBlock = 1;
  if (fs.existsSync("./latestBlock.txt")) {
    lastBlock = parseInt(fs.readFileSync("./latestBlock.txt").toString());
  } else {
    fs.writeFileSync("./latestBlock.txt", "1");
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
          console.log("tx:", txs);
          if (txs.length > 0) await eventRecorder(txs); //batch record for each block, insert all txs from a block at once
          fs.writeFileSync("./latestBlock.txt", i.toString());
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
