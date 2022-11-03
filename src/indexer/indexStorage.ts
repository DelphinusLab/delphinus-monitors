import { BN } from "bn.js";
import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { CommandOp, commandName } from "delphinus-l2-client-helper/src/swap";
import { DBHelper, withDBHelper } from "web3subscriber/src/dbhelper";
import {
  BaseEvent,
  DepositArgs,
  WithdrawArgs,
  SwapArgs,
  SupplyArgs,
  RetrieveArgs,
  AckArgs,
  SetKeyArgs,
  AddPoolArgs,
} from "./types";

import {
  DepositEvent,
  WithdrawEvent,
  SwapEvent,
  SupplyEvent,
  RetrieveEvent,
  AckEvent,
  SetKeyEvent,
  AddPoolEvent,
} from "./types";

export interface Block {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
}

export interface BaseExtrinsic extends Block {
  // All this data is obtainable for failed and successful extrinsics
  extrinsicIndex: number;
  extrinsicHash: string;
  module: string;
  method: string;
  args: any; //TODO: type this
  fee: string;
  signer: string;
}

export interface ExtrinsicSuccess extends BaseExtrinsic {
  //TODO: turn into custom transaction data such as ReqID etc...
  data: any[]; // event data from extrinsic
}

export interface ExtrinsicFail extends BaseExtrinsic {
  error: string; //Error message from the node
}

export interface DBExtrinsic<T, K> {
  rid?: string; // Only successfull transactions will have a ReqID
  blockNumber: number;
  extrinsicIndex: number;
  txId: string; // extrinsicId + blockNumber (formatted maybe such as 1234-5678)
  signer: string; //L2 address of the signer
  command: string; // Command name
  args: T; // Command arguments (inputs)
  fee: string; // Fee paid for the transaction
  timestamp: number; // Timestamp of the block
  data?: K; // Event data from extrinsic TODO: successfull tx data based on Op
  error?: string; //Error message from the node TODO: Error info based on Op
}

//Use this function to parse input args, and store in the correct formatting for mongodb
function parseArgs(method: string, args: any[]) {
  if (method === "swap") {
    return {
      signature: args[0],
      poolIndex: args[1],
      reverse: args[2],
      amount: args[3],
      nonce: args[4],
    } as SwapArgs;
  } else if (method === "poolSupply") {
    return {
      signature: args[0],
      poolIndex: args[1],
      amount0: args[2],
      amount1: args[3],
      nonce: args[4],
    } as SupplyArgs;
  } else if (method === "poolRetrieve") {
    return {
      signature: args[0],
      poolIndex: args[1],
      amount0: args[2],
      amount1: args[3],
      nonce: args[4],
    } as RetrieveArgs;
  } else if (method === "deposit") {
    return {
      signature: args[0],
      accountIndex: args[1],
      tokenIndex: args[2],
      amount: args[3],
      l1_tx_hash: args[4],
      nonce: args[5],
    } as DepositArgs;
  } else if (method === "withdraw") {
    return {
      signature: args[0],
      tokenIndex: args[1],
      amount: args[2],
      l1Account: args[3],
      nonce: args[4],
    } as WithdrawArgs;
  } else if (method === "setKey") {
    return {
      key: args[0],
    } as SetKeyArgs;
  } else if (method === "addPool") {
    return {
      signature: args[0],
      tokenIndex0: args[1],
      tokenIndex1: args[2],
      nonce: args[3],
    } as AddPoolArgs;
  } else if (method === "ack") {
    return {
      reqIdStart: args[0],
    } as AckArgs;
  } else {
    throw new Error("Untracked or invalid method found in extrinsic");
  }
}

//Use this function to parse successful event data, and store in the correct formatting for mongodb
function parseData(method: string, data: any[]) {
  let baseData: BaseEvent = {
    reqId: data[0],
    sig1: data[1],
    sig2: data[2],
    sig3: data[3],
    nonce: data[4],
    accountIndex: data[5],
  };
  if (method === "swap") {
    let parsedData = { ...baseData } as SwapEvent;
    parsedData.poolIndex = data[6];
    parsedData.reverse = data[7];
    parsedData.amount = data[8];
    return parsedData;
  } else if (method === "poolSupply") {
    let parsedData = { ...baseData } as SupplyEvent;
    parsedData.poolIndex = data[6];
    parsedData.amount0 = data[7];
    parsedData.amount1 = data[8];
    return parsedData;
  } else if (method === "poolRetrieve") {
    let parsedData = { ...baseData } as RetrieveEvent;
    parsedData.poolIndex = data[6];
    parsedData.amount0 = data[7];
    parsedData.amount1 = data[8];
    return parsedData;
  } else if (method === "deposit") {
    let parsedData = { ...baseData } as DepositEvent;
    parsedData.tokenIndex = data[6];
    parsedData.amount = data[7];
    parsedData.reserveU256 = data[8];
    parsedData.relayer = data[9];
    return parsedData;
  } else if (method === "withdraw") {
    let parsedData = { ...baseData } as WithdrawEvent;
    parsedData.tokenIndex = data[6];
    parsedData.amount = data[7];
    parsedData.l1Account = data[8];
    return parsedData;
  } else if (method === "setKey") {
    let parsedData = { ...baseData } as SetKeyEvent;
    parsedData.reserved = data[6];
    parsedData.x = data[7];
    parsedData.y = data[8];
    return parsedData;
  } else if (method === "addPool") {
    let parsedData: AddPoolEvent = {
      reqId: data[0],
      sig1: data[1],
      sig2: data[2],
      sig3: data[3],
      nonce: data[4],
      tokenIndex0: data[5],
      tokenIndex1: data[6],
      reserve0: data[7],
      poolIndex: data[8],
      sender: data[9],
    };
    return parsedData;
  } else if (method === "ack") {
    let parsedData: AckEvent = {
      reqIdStart: data[0],
      ackBits: data[1],
    };
    return parsedData;
  } else {
    throw new Error("Untracked or invalid method found in extrinsic");
  }
}

export class EventRecorderDB extends DBHelper {
  async drop() {
    const collection = await this.getOrCreateEventCollection("l2_transactions");
    await collection.drop();
  }
  //TODO: use updated saveEvent function to store all tx info
  //create types for events and extrinsics
  async saveEvent(transactions: (ExtrinsicSuccess | ExtrinsicFail)[]) {
    const { blockNumber, extrinsicIndex } = transactions[0];
    const collection = await this.getOrCreateEventCollection("l2_transactions");

    let r = await collection.findOne({
      blockNumber: blockNumber,
      extrinsicIndex: extrinsicIndex,
    });

    if (r === null) {
      console.log("inserting transactions");
      //TODO: handle case of missing tx from block
      await collection.insertMany(transactions);
    }
  }

  async loadEvents() {
    const collection = await this.getOrCreateEventCollection("l2_transactions");
    // rid is suppose to match event(op)
    return await collection
      .aggregate([
        {
          $group: {
            _id: "$rid",
            docs: {
              $first: "$$ROOT",
            },
          },
        },
      ])
      .toArray();
  }
  async getLatestEntry() {
    const collection = await this.getOrCreateEventCollection("l2_transactions");
    const r = await collection
      .find<DBExtrinsic<any, any>>({})
      .sort({ $natural: -1 })
      .limit(1)
      .toArray();

    return r;
  }
}

/**
 * Record L2 Event in DB
 */
export async function eventRecorder(
  transactions: (ExtrinsicFail | ExtrinsicSuccess)[]
) {
  const uri = await getL2EventRecorderDbUri();
  //TODO: Parse transaction data into DB format with DBExtrinsic Type

  await withDBHelper(
    EventRecorderDB,
    uri,
    "substrate",
    async (db: EventRecorderDB) => {
      await db.saveEvent(transactions);
    }
  );
}

export async function latestDbTx() {
  const uri = await getL2EventRecorderDbUri();
  return await withDBHelper(
    EventRecorderDB,
    uri,
    "substrate",
    async (db: EventRecorderDB) => {
      const r = await db.getLatestEntry();
      return r;
    }
  );
}

export async function clearDb() {
  const uri = await getL2EventRecorderDbUri();
  return await withDBHelper(
    EventRecorderDB,
    uri,
    "substrate",
    async (db: EventRecorderDB) => {
      const r = await db.drop();
      return r;
    }
  );
}
