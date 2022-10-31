import { BN } from "bn.js";
import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { CommandOp, commandName } from "delphinus-l2-client-helper/src/swap";
import { DBHelper, withDBHelper } from "web3subscriber/src/dbhelper";
import { EventHandler } from "../substrate";

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
  //TODO: turn into custom Delphinus transaction data such as ReqID etc...
  data: any[]; // event data from extrinsic
}

export interface ExtrinsicFail extends BaseExtrinsic {
  error: string; //Error message from the node
}

export interface DBExtrinsic {
  rid?: string; // Only successfull transactions will have a ReqID
  blockNumber: number;
  extrinsicIndex: number;
  txId: string; // extrinsicId + blockNumber (formatted maybe such as 1234-5678)
  signer: string; //L2 address of the signer
  command: string; // Command name
  args: any; // Command arguments (inputs)
  fee: string; // Fee paid for the transaction
  timestamp: number; // Timestamp of the block
  data?: any[]; // Event data from extrinsic TODO: successfull tx data based on Op
  error?: string; //Error message from the node TODO: Error info based on Op
}

type docType = {
  rid: string;
  command: CommandOp;
  args: string[];
};

function parseEvent(doc: docType) {
  // mongo db data format
  let arg: { [key: string]: string } = {
    rid: "",
    command: "",
    arg0: "",
    arg1: "",
    arg2: "",
    arg3: "",
    arg4: "",
    arg5: "",
    arg6: "",
    arg7: "",
    arg8: "",
    arg9: "",
    sender: "",
    target: "",
  };

  arg.rid = doc.rid;
  arg.command = commandName(doc.command);

  for (let i = 0; i < doc.args.length; i++) {
    arg["arg" + i] = doc.args[i];
  }

  if (doc.command === CommandOp.Deposit) {
    arg.sender = doc.args[8];
    arg.target = doc.args[4];
  } else if (
    doc.command === CommandOp.Withdraw ||
    doc.command === CommandOp.SetKey
  ) {
    arg.sender = doc.args[4];
    arg.target = doc.args[4];
  } else if (
    doc.command === CommandOp.Swap ||
    doc.command === CommandOp.Retrieve ||
    doc.command === CommandOp.Supply
  ) {
    arg.sender = doc.args[4];
    arg.target = doc.args[5];
  } else if (doc.command === CommandOp.AddPool) {
    arg.sender = doc.args[9];
    arg.target = doc.args[8];
  }
  return arg;
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
    const collection = await this.getOrCreateEventCollection(
      "l2_transactions"
    );
    
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
    const r = await collection.find<DBExtrinsic>({}).sort({ $natural: -1 }).limit(1).toArray();
   
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
