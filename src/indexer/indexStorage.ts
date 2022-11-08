import { BN } from "bn.js";
import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { CommandOp, commandName } from "delphinus-l2-client-helper/src/swap";
import { DBHelper, withDBHelper } from "web3subscriber/src/dbhelper";
import {
  ExtrinsicFail,
  ExtrinsicSuccess,
  BaseEvent,
  DepositArgs,
  WithdrawArgs,
  SwapArgs,
  SupplyArgs,
  RetrieveArgs,
  AckArgs,
  SetKeyArgs,
  AddPoolArgs,
  ChargeArgs,
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
  ChargeEvent,
} from "./types";

//User Events are ones containing a reqId for the operation
export type UserEvents =
  | SetKeyEvent
  | DepositEvent
  | SwapEvent
  | SupplyEvent
  | RetrieveEvent
  | WithdrawEvent
  | AddPoolEvent;
//Relayer events are ones that do not contain a reqId for the operation
export type RelayerEvents = AckEvent | ChargeEvent;
export type UserArgs =
  | SetKeyArgs
  | DepositArgs
  | SwapArgs
  | SupplyArgs
  | RetrieveArgs
  | WithdrawArgs
  | AddPoolArgs;
export type RelayerArgs = AckArgs | ChargeArgs;

//Types for storing in mongodb, T represents Input/Arg types and K represents Output/Event types
export interface DBExtrinsic<T, K = undefined> {
  rid?: number; // Only successfull transactions will have a ReqID
  blockNumber: number;
  extrinsicIndex: number;
  signer: string; //L2 address of the signer
  accountIndex?: number; //L2 account index of the signer - only emitted from events
  command: string; // Command name
  args: T; // Command arguments (inputs)
  fee: string; // Fee paid for the transaction
  timestamp: number; // Timestamp of the block
  data?: K; // Event data from extrinsic TODO: successfull tx data based on Op
  error?: string; //Error message from the node TODO: Error info based on Op
}

//Use this function to parse input args, and store in the correct formatting for mongodb
function parseArgs(method: string, args: any[]) {
  if (method === "charge") {
    return {
      l2Address: args[0],
      amount: args[1],
      l1_tx_hash: args[2],
    } as ChargeArgs;
  } else if (method === "swap") {
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
  if (method === "charge") {
    return {
      relayerAddress: data[0],
      amount: data[1],
      blockNumber: data[2],
    } as ChargeEvent; // Does not extend base event
  } else if (method === "swap") {
    return {
      ...baseData,
      poolIndex: data[6],
      reverse: data[7],
      amount: data[8],
    } as SwapEvent;
  } else if (method === "poolSupply") {
    return {
      ...baseData,
      poolIndex: data[6],
      amount0: data[7],
      amount1: data[8],
    } as SupplyEvent;
  } else if (method === "poolRetrieve") {
    return {
      ...baseData,
      poolIndex: data[6],
      amount0: data[7],
      amount1: data[8],
    } as RetrieveEvent;
  } else if (method === "deposit") {
    return {
      ...baseData,
      tokenIndex: data[6],
      amount: data[7],
      reserveU256: data[8],
      relayer: data[9],
    } as DepositEvent;
  } else if (method === "withdraw") {
    return {
      ...baseData,
      tokenIndex: data[6],
      amount: data[7],
      l1Account: data[8],
    } as WithdrawEvent;
  } else if (method === "setKey") {
    return {
      ...baseData,
      reserved: data[6],
      x: data[7],
      y: data[8],
    } as SetKeyEvent;
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
      accountIndex: data[9],
    };
    return parsedData;
  } else if (method === "ack") {
    let parsedData: AckEvent = {
      reqIdStart: data[0],
      ackBits: data[1],
    };
    return parsedData;
  } else {
    //Maybe throw error if unhandled method
    console.log("Untracked or invalid method found in extrinsic: ", method);
    return data;
  }
}

function extrinsicToDbExtrinsic(extrinsic: ExtrinsicSuccess | ExtrinsicFail) {
  let parsedArgs = parseArgs(extrinsic.method, extrinsic.args);
  //handle error scenario
  if ("error" in extrinsic) {
    return {
      blockNumber: extrinsic.blockNumber,
      extrinsicIndex: extrinsic.extrinsicIndex,
      signer: extrinsic.signer,
      command: extrinsic.method,
      args: parsedArgs,
      fee: extrinsic.fee,
      timestamp: extrinsic.timestamp,
      error: extrinsic.error,
    } as DBExtrinsic<UserArgs | RelayerArgs>; //data property is undefined on an error due to lack of event emitted.
  }

  //parse the data if extrinsic is non-error
  let parsedData = parseData(extrinsic.method, extrinsic.data);
  //handle successful user scenario
  if ("reqId" in parsedData) {
    return {
      rid: parsedData.reqId,
      blockNumber: extrinsic.blockNumber,
      extrinsicIndex: extrinsic.extrinsicIndex,
      signer: extrinsic.signer,
      command: extrinsic.method,
      accountIndex: parsedData.accountIndex,
      args: parsedArgs,
      fee: extrinsic.fee,
      timestamp: extrinsic.timestamp,
      data: parsedData,
    } as DBExtrinsic<UserArgs, UserEvents>;
  }

  //handle successful relayer scenario (ack, charge), which do not have a reqId
  else {
    return {
      blockNumber: extrinsic.blockNumber,
      extrinsicIndex: extrinsic.extrinsicIndex,
      signer: extrinsic.signer,
      command: extrinsic.method,
      args: parsedArgs,
      fee: extrinsic.fee,
      timestamp: extrinsic.timestamp,
      data: parsedData,
    } as DBExtrinsic<RelayerArgs, RelayerEvents>;
  }
}

export class EventRecorderDB extends DBHelper {
  async drop() {
    const collection = await this.getOrCreateEventCollection("l2_transactions");
    await collection.drop();
  }

  async saveTransactions(
    transactions: DBExtrinsic<
      UserArgs | RelayerArgs,
      UserEvents | RelayerEvents | undefined
    >[]
  ) {
    const { blockNumber, extrinsicIndex } = transactions[0];
    const collection = await this.getOrCreateEventCollection("l2_transactions");

    //Check if the block already exists
    //TODO: this will not work if a block is only half synchronised
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

  let txs = transactions.map((tx) => extrinsicToDbExtrinsic(tx));
  await withDBHelper(
    EventRecorderDB,
    uri,
    "substrate",
    async (db: EventRecorderDB) => {
      await db.saveTransactions(txs);
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
