const EthSubscriber = require("web3subscriber/syncdb");
const EthConfig = require('../../config/ethconfig1');
const BridgeJSON = require(EthConfig.contracts + "/Bridge.json");

let etracker = new EthSubscriber.EventTracker(EthConfig.device_id, BridgeJSON, EthConfig, (n,v) => {
  handlers[n](v);
});

etracker.reset_events().then(() => {
  console.log("reset events done.");
  process.exit();
});
