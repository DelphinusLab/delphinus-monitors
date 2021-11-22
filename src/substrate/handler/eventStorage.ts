import { BN } from "bn.js";
import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { CommandOp } from "delphinus-zkp/src/zokrates/command";
import { DBHelper, withDBHelper } from "web3subscriber/src/dbhelper";
import { EventHandler } from "..";

class EventRecorderDB extends DBHelper {
  async saveEvent(rid: string, op: CommandOp, args: any[]) {
    const collection = await this.getOrCreateEventCollection("l2_event");
    const argsPadding = args.concat(Array(8).fill(new BN(0))).slice(0, 8);
    const doc = {
      rid: rid,
      command: op,
      arg0: argsPadding[0].toString(),
      arg1: argsPadding[1].toString(),
      arg2: argsPadding[2].toString(),
      arg3: argsPadding[3].toString(),
      arg4: argsPadding[4].toString(),
      arg5: argsPadding[5].toString(),
      arg6: argsPadding[6].toString(),
      arg7: argsPadding[7].toString(),
    };

    await collection.insertOne(doc);
  }
}

/**
 * Record L2 Event in DB
 */
export async function eventRecorder(rid: string, op: CommandOp, args: any[]) {
  const uri = await getL2EventRecorderDbUri();

  await withDBHelper(EventRecorderDB, uri, async (db: EventRecorderDB) => {
    await db.saveEvent(rid, op, args);
  });
}

export const handler: EventHandler = {
  eventHandler: eventRecorder,
};
