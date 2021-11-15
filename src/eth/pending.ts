import { EventTracker } from "web3subscriber/src/sync-pending-events";
import { EthConfigEnabled } from "delphinus-deployment/src/config";

const BridgeJSON = require("solidity/build/contracts/Bridge.json");

async function main() {
  const config = EthConfigEnabled.find(config => config.chain_name === process.argv[2])!;
  console.log("config:", config);

  let etracker = new EventTracker(
    config.device_id,
    BridgeJSON,
    config.ws_source,
    config.monitor_account,
    config.mongodb_url,
    async (n, v, h) => {}
  );

  await etracker.subscribePendingEvents().then(v => {
    console.log("start subscribe pending events:");
  });
}

main();
