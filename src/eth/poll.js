const Web3 = require("web3");
const FileSys = require("fs");
const EthSubscriber = require("web3subscriber/syncdb");
const EthConfig = require('solidity/clients/config.js');
const substrateNode = require('../../config/substrate-node.json');
const substrateClient = require('../substrate/client');
const bridge = require('solidity/clients/bridge/bridge.js');
const l2address = require('./l2address');
const BigNumber = Web3.utils.BN;
const event_queue = require('../substrate/event-queue');
const RioTokenInfo = require("solidity/build/contracts/Rio.json");
const tokenIndex = require("solidity/clients/token-index.json");

let config = EthConfig[process.argv[2]];
console.log("config:", config);

let charge_address = RioTokenInfo.networks[config.device_id].address;
let encoded_charge_address = "0x" + bridge.encodeL1Address(charge_address.substring(2), config.device_id).toString(16);

console.log("encoded charge address is", encoded_charge_address);

const client = new substrateClient.SubstrateClient(`${substrateNode.host}:${substrateNode.port}`, parseInt(config.device_id));

function to_hex_str(a) {
  let c = new BigNumber(a);
  return ("0x" + c.toString(16));
}

function to_dec_str(a) {
  let c = new BigNumber(a);
  return (c.toString(10));
}

let queue = new event_queue.EventQueue(async (id) => {
  await client.ack(id);
});

async function handle_deposit(v, hash_str) {
  console.log("Deposit token_addr:", to_hex_str(v.l1token));
  let l2account = l2address.bn_to_ss58(v.l2account);
  console.log("To l2 account:", l2account, " with amount: ", v.amount);
  console.log("Final balance:", v.balance, to_hex_str(v.l2account));

  //await client.deposit(l2account, tokenIndex[to_dec_str(v.l1token)], v.amount, hash_str);
}

async function handle_charge(v) {
  console.log("Charge token_addr:", to_hex_str(v.l1token));
  let l2account = l2address.bn_to_ss58(v.l2account);
  //await client.charge(l2account, v.amount);
}

let handlers = {
  Deposit: async (v, hash) => {
    if (to_hex_str(v.l1token) == encoded_charge_address) {
      await handle_charge(v);
    } else {
      await handle_deposit(v, hash);
    }
  },
  WithDraw: (v, hash) => {
    console.log("WithDraw", v.l1account, v.l2account, v.amount, v.balance);
  },
  SwapAck: async (v, hash) => {
    console.log("Transfer", v.l2account, v.rid);
    let l2account = l2address.bn_to_ss58(v.l2account);
    //await client.ack(v.rid);
  }
}

const BridgeJSON = require(config.contracts + "/Bridge.json");

let etracker = new EthSubscriber.EventTracker(config.device_id, BridgeJSON, config, async (n,v,hash) => {
  await handlers[n](v, hash);
});

etracker.sync_events().then(v => {
  console.log("start subscribe events:");
});
