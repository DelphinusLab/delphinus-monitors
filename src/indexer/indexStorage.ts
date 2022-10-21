import { BN } from "bn.js";
import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { CommandOp, commandName } from "delphinus-l2-client-helper/src/swap";
import { DBHelper, withDBHelper } from "web3subscriber/src/dbhelper";
import { EventHandler } from "../substrate";

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
  async saveEvent(rid: string, op: CommandOp, args: any[]) {
    const collection = await this.getOrCreateEventCollection(
      "l2_transactions",
      { rid: 1 }
    );
    let r = await collection.findOne({ rid: rid });
    if (r === null) {
      const doc = {
        rid: rid,
        command: op,
        args: args.map((x) => x.toString()),
      };
      await collection.insertOne(parseEvent(doc));
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
      .map((x) => x.docs)
      .sort((e1, e2) => (new BN(e1.rid).sub(new BN(e2.rid)).isNeg() ? -1 : 1));
  }
}

/**
 * Record L2 Event in DB
 */
export async function eventRecorder(rid: string, op: CommandOp, args: any[]) {
  const uri = await getL2EventRecorderDbUri();

  await withDBHelper(
    EventRecorderDB,
    uri,
    "substrate",
    async (db: EventRecorderDB) => {
      await db.saveEvent(rid, op, args);
    }
  );
}

export const handler: EventHandler = {
  eventHandler: eventRecorder,
};
