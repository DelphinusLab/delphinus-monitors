import { EventTracker } from "web3subscriber/src/sync-pending-events";
import { getConfigByChainName } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { getEventSyncStartingPointByChainID } from "../tools/getEventSyncStartingPoint";
import { getBufferBlocks } from "../tools/getBufferBlocks";

const BridgeJSON = require("solidity/build/contracts/Bridge.json");

async function main() {
  const config = await getConfigByChainName(
    L1ClientRole.Monitor,
    process.argv[2]
  );
  console.log("config:", config);
  let eventSyncStartingPoint = await getEventSyncStartingPointByChainID(config.deviceId);
  let bufferBlocks = await getBufferBlocks(config.chainName);

  let etracker = new EventTracker(
    config.deviceId,
    BridgeJSON,
    config.wsSource,
    config.monitorAccount,
    config.mongodbUrl,
    config.syncEventsStep,
    eventSyncStartingPoint,
    bufferBlocks,
  );

  await etracker.subscribePendingEvents().then((v) => {
    console.log("start subscribe pending events:");
  });
}

main();
