import { BN } from "bn.js";
import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { CommandOp, commandName } from "delphinus-l2-client-helper/src/swap";
import { DBHelper, withDBHelper } from "web3subscriber/src/dbhelper";
import { EventHandler } from "../substrate";

export interface BaseExtrinsic {
  // All this data is obtainable for failed and successful extrinsics
  blockNumber: number;
  blockHash: string;
  extrinsicIndex: number;
  extrinsicHash: string;
  module: string;
  method: string;
  args: any; //TODO: type this
  fee: string;
  timestamp: number;
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
  async saveEvent(transaction: DBExtrinsic) {
    const collection = await this.getOrCreateEventCollection(
      "l2_transactions",
      { rid: 1 }
    );
    let r = await collection.findOne({ rid: transaction.rid });
    if (r === null) {
      // const doc = {
      //   rid: rid,
      //   command: op,
      //   args: args.map((x) => x.toString()),
      // };
      await collection.insertOne(transaction);
    }
  }

  async loadEvents() {
    const collection = await this.getOrCreateEventCollection("l2_transactions");
    // rid is suppose to match event(op)
    return (
      await collection
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
        .toArray()
    )
      
  }
}

/**
 * Record L2 Event in DB
 */
export async function eventRecorder(transaction: ExtrinsicFailed | ExtrinsicSuccess) {
  const uri = await getL2EventRecorderDbUri();
  //TODO: Parse transaction data into DB format

  await withDBHelper(
    EventRecorderDB,
    uri,
    "substrate",
    async (db: EventRecorderDB) => {
      await db.saveEvent(transaction as DBExtrinsic);
    }
  );
}

export const handler: EventHandler = {
  eventHandler: eventRecorder,
};
