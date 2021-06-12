const Web3 = require("web3");
const FileSys = require("fs");
const EthSubscriber = require("web3subscriber/syncdb");
const EthConfig = require('solidity/clients/config.js');
const substrateNode = require('../../config/substrate-node.json');
const substrateClient = require('../substrate/client');
const l2address = require('./l2address');
const BigNumber = Web3.utils.BN;
const event_queue = require('../substrate/event-queue');

const client = new substrateClient.SubstrateClient(`${substrateNode.host}:${substrateNode.port}`, 15);

function to_hex_str(a) {
  let c = new BigNumber(a);
  return ("0x" + c.toString(16));
}

let queue = new event_queue.EventQueue(async (id) => {
  await client.ack(id);
});

let handlers = {
  Deposit: v => {
    console.log("Deposit token_addr:", to_hex_str(v.l1token));
    let l2account = l2address.bn_to_ss58(v.l2account);
    console.log("To l2 account:", l2account, " with amount: ", v.amount);
    console.log("Final balance:", v.balance, to_hex_str(v.l2account));
    client.deposit(l2account, v.l1token, v.amount);
  },
  WithDraw: v => {
    console.log("WithDraw", v.l1account, v.l2account, v.amount, v.balance);
  },
  SwapAck: v => {
    console.log("Transfer", v.l2account, v.rid);
    let l2account = l2address.bn_to_ss58(v.l2account);
    queue.push(v.rid);
  }
}

let config = EthConfig[process.argv[2]];
console.log("config:", config);
const BridgeJSON = require(config.contracts + "/Bridge.json");

let etracker = new EthSubscriber.EventTracker(config.device_id, BridgeJSON, config, (n,v) => {
    handlers[n](v);
  });

etracker.subscribe_events().then(v => {
  console.log("start subscribe events:");
});
