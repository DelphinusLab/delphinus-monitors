import { EventTracker } from "web3subscriber/src/sync-pending-events";

const EthConfig = require('solidity/clients/config.js');
const Secrets = require('solidity/.secrets.json');

let config = EthConfig[process.argv[2]](Secrets);
console.log("config:", config);

const BridgeJSON = require(config.contracts + "/Bridge.json");

let etracker = new EventTracker(config.device_id, BridgeJSON, config, (n,v) => {});

etracker.resetEvents().then(() => {
  console.log("reset events done.");
  process.exit();
});
