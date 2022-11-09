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
    let chargeArgs: ChargeArgs = {
      l2Address: args[0],
      amount: args[1],
      l1_tx_hash: args[2],
    };
    return chargeArgs;
  } else if (method === "swap") {
    let swapArgs: SwapArgs = {
      signature: args[0],
      poolIndex: args[1],
      reverse: args[2],
      amount: args[3],
      nonce: args[4],
    };
    return swapArgs;
  } else if (method === "poolSupply") {
    let supplyArgs: SupplyArgs = {
      signature: args[0],
      poolIndex: args[1],
      amount0: args[2],
      amount1: args[3],
      nonce: args[4],
    };
    return supplyArgs;
  } else if (method === "poolRetrieve") {
    let retrieveArgs: RetrieveArgs = {
      signature: args[0],
      poolIndex: args[1],
      amount0: args[2],
      amount1: args[3],
      nonce: args[4],
    };
    return retrieveArgs;
  } else if (method === "deposit") {
    let depositArgs: DepositArgs = {
      signature: args[0],
      accountIndex: args[1],
      tokenIndex: args[2],
      amount: args[3],
      l1_tx_hash: args[4],
      nonce: args[5],
    };
    return depositArgs;
  } else if (method === "withdraw") {
    let withdrawArgs: WithdrawArgs = {
      signature: args[0],
      tokenIndex: args[1],
      amount: args[2],
      l1Account: args[3],
      nonce: args[4],
    };
    return withdrawArgs;
  } else if (method === "setKey") {
    let setKeyArgs: SetKeyArgs = {
      key: args[0],
    };
    return setKeyArgs;
  } else if (method === "addPool") {
    let addPoolArgs: AddPoolArgs = {
      signature: args[0],
      tokenIndex0: args[1],
      tokenIndex1: args[2],
      nonce: args[3],
    };
    return addPoolArgs;
  } else if (method === "ack") {
    let ackArgs: AckArgs = {
      reqIdStart: args[0],
    };
    return ackArgs;
  } else {
    //TODO: handle this scenario, this may occur if trying to record non swapModule extrinsics
    console.log("Untracked or invalid method found in extrinsic: ", method);
    return args;
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
  };
  if (method === "charge") {
    return {
      relayerAddress: data[0],
      amount: data[1],
      blockNumber: data[2],
    } as ChargeEvent; // Does not extend base event
  } else if (method === "swap") {
    let swapData: SwapEvent = {
      ...baseData,
      accountIndex: data[5],
      poolIndex: data[6],
      reverse: data[7],
      amount: data[8],
    };
    return swapData;
  } else if (method === "poolSupply") {
    let supplyData: SupplyEvent = {
      ...baseData,
      accountIndex: data[5],
      poolIndex: data[6],
      amount0: data[7],
      amount1: data[8],
    };
    return supplyData;
  } else if (method === "poolRetrieve") {
    let retrieveData: RetrieveEvent = {
      ...baseData,
      accountIndex: data[5],
      poolIndex: data[6],
      amount0: data[7],
      amount1: data[8],
    };
    return retrieveData;
  } else if (method === "deposit") {
    let depositData: DepositEvent = {
      ...baseData,
      accountIndex: data[5],
      tokenIndex: data[6],
      amount: data[7],
      reserveU256: data[8],
      callerAccountIndex: data[9],
    };
    return depositData;
  } else if (method === "withdraw") {
    let withdrawData: WithdrawEvent = {
      ...baseData,
      accountIndex: data[5],
      tokenIndex: data[6],
      amount: data[7],
      l1Account: data[8],
    };
    return withdrawData;
  } else if (method === "setKey") {
    let setKeyData: SetKeyEvent = {
      ...baseData,
      accountIndex: data[5],
      reserveU32: data[6],
      x: data[7],
      y: data[8],
    };
    return setKeyData;
  } else if (method === "addPool") {
    let parsedData: AddPoolEvent = {
      reqId: data[0],
      sig1: data[1],
      sig2: data[2],
      sig3: data[3],
      nonce: data[4],
      tokenIndex0: data[5],
      tokenIndex1: data[6],
      reserve_0: data[7],
      reserve_1: data[8],
      poolIndex: data[9],
      callerAccountIndex: data[10],
    };
    return parsedData;
  } else if (method === "ack") {
    let parsedData: AckEvent = {
      reqIdStart: data[0],
      ackBits: data[1],
    };
    return parsedData;
  } else {
    //TODO: handle this scenario, this may occur if trying to record non swapModule extrinsics
    //Maybe throw error if unhandled method
    console.log("Untracked or invalid method found in extrinsic: ", method);
    return data;
  }
}

function extrinsicToDbExtrinsic(extrinsic: ExtrinsicSuccess | ExtrinsicFail) {
  let parsedArgs = parseArgs(extrinsic.method, extrinsic.args);
  //handle error scenario
  if ("error" in extrinsic) {
    let errorExtrinsic: DBExtrinsic<UserArgs | RelayerArgs> = {
      blockNumber: extrinsic.blockNumber,
      extrinsicIndex: extrinsic.extrinsicIndex,
      signer: extrinsic.signer,
      command: extrinsic.method,
      args: parsedArgs as UserArgs | RelayerArgs,
      fee: extrinsic.fee,
      timestamp: extrinsic.timestamp,
      error: extrinsic.error,
    };
    return errorExtrinsic; //data property is undefined on an error due to lack of event emitted.
  }

  //parse the data if extrinsic is non-error
  let parsedData = parseData(extrinsic.method, extrinsic.data);
  //handle successful user scenario
  if ("reqId" in parsedData) {
    //AddPool will use callerAccountIndex, all other events will use accountIndex
    if ("accountIndex" in parsedData) {
      let userExtrinsic: DBExtrinsic<UserArgs, UserEvents> = {
        rid: parsedData.reqId,
        blockNumber: extrinsic.blockNumber,
        extrinsicIndex: extrinsic.extrinsicIndex,
        signer: extrinsic.signer,
        command: extrinsic.method,
        accountIndex: parsedData.accountIndex,
        args: parsedArgs as UserArgs,
        fee: extrinsic.fee,
        timestamp: extrinsic.timestamp,
        data: parsedData,
      };
      return userExtrinsic;
    }
    let addPoolExtrinsic: DBExtrinsic<AddPoolArgs, AddPoolEvent> = {
      rid: parsedData.reqId,
      blockNumber: extrinsic.blockNumber,
      extrinsicIndex: extrinsic.extrinsicIndex,
      signer: extrinsic.signer,
      command: extrinsic.method,
      accountIndex: parsedData.callerAccountIndex,
      args: parsedArgs as AddPoolArgs,
      fee: extrinsic.fee,
      timestamp: extrinsic.timestamp,
      data: parsedData,
    };
    return addPoolExtrinsic;
  }

  //handle successful relayer scenario (ack, charge), which do not have a reqId
  else {
    let relayerExtrinsic: DBExtrinsic<RelayerArgs, RelayerEvents> = {
      blockNumber: extrinsic.blockNumber,
      extrinsicIndex: extrinsic.extrinsicIndex,
      signer: extrinsic.signer,
      command: extrinsic.method,
      args: parsedArgs as RelayerArgs,
      fee: extrinsic.fee,
      timestamp: extrinsic.timestamp,
      data: parsedData as RelayerEvents,
    };
    return relayerExtrinsic;
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
