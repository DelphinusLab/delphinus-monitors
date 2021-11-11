import { toHexStr, toDecStr, toSS58 } from "web3subscriber/src/addresses";
import { EventTracker } from "web3subscriber/src/sync-pending-events";
import {
  Deposit as DepositEventType,
  SwapAck as SwapAckEventType,
  WithDraw as WithDrawEventType,
} from "solidity/clients/types/events";
import { EthConfig } from "solidity/clients/config";

import { SubstrateClient, withL2Client as L2Client } from "../substrate/client";
import { Rio } from "./rio";

const substrateNode = require("../../config/substrate-node.json");
const tokenIndex = require("solidity/clients/token-index.json");
/* We should using local secrets instead of debuggin secrets */
const Secrets = require("solidity/.secrets.json");
const BridgeJSON = require("solidity/build/contracts/Bridge.json");

const config = EthConfig[process.argv[2]](Secrets);
console.log("config:", config);

async function withL2Client(cb: (l2Client: SubstrateClient) => Promise<void>) {
  return L2Client(
    `${substrateNode.host}:${substrateNode.port}`,
    cb,
    parseInt(config.device_id),
  );
}

async function handleCharge(v: DepositEventType) {
  return withL2Client(async (l2Client: SubstrateClient) => {
    let l2account = toSS58(v.l2account);
    console.log("Charge token_addr:", toHexStr(v.l1token));
    await l2Client.charge(l2account, v.amount);
  });
}

async function handleDeposit(v: DepositEventType, hash: string) {
  return withL2Client(async (l2Client: SubstrateClient) => {
    let l2account = toSS58(v.l2account);
    console.log("Deposit token_addr:", toHexStr(v.l1token));
    console.log("To l2 account:", l2account, " with amount: ", v.amount);
    console.log("nonce:", v.nonce);
    await l2Client.deposit(
      l2account,
      tokenIndex[toDecStr(v.l1token)],
      v.amount,
      hash
    );
  });
}

async function handleWithDraw(v: WithDrawEventType) {
  console.log("WithDraw", v.l1account, v.l2account, v.amount, v.nonce);
}

async function handleAck(v: SwapAckEventType) {
  return withL2Client(async (l2Client: SubstrateClient) => {
    console.log("Transfer", v.l2account, v.rid);
    await l2Client.ack(v.rid);
  });
}

const handlers = {
  Deposit: async (v: DepositEventType, hash: string) => {
    if (toHexStr(v.l1token) == Rio.getChargeAddress(config.device_id)) {
      await handleCharge(v);
    } else {
      await handleDeposit(v, hash);
    }
  },
  WithDraw: async (v: WithDrawEventType, _hash: string) => {
    await handleWithDraw(v);
  },
  SwapAck: async (v: SwapAckEventType, _hash: string) => {
    await handleAck(v);
  },
};

async function main() {
  let etracker = new EventTracker(
    config.device_id,
    BridgeJSON,
    config.ws_source,
    config.monitor_account,
    config.mongodb_url,
    async (eventName: string, v: any, hash: string) => {
      return (handlers as any)[eventName](v, hash);
    }
  );

  await etracker.syncEvents(false);
  console.log("exiting...");
  etracker.close();
}

main();
