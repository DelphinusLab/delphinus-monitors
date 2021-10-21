const EthSubscriber = require("web3subscriber/syncdb");
const EthConfig = require('solidity/clients/config.js');
const Secrets = require('solidity/.secrets.json');

let config = EthConfig[process.argv[2]](Secrets);
console.log("config:", config);

const BridgeJSON = require(config.contracts + "/Bridge.json");

let etracker = new EthSubscriber.EventTracker(config.device_id, BridgeJSON, config, (n,v) => {});

etracker.reset_events().then(() => {
  console.log("reset events done.");
  process.exit();
});
