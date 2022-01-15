import { BN } from "bn.js";
import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { CommandOp } from "delphinus-l2-client-helper/src/swap";
import { DBHelper, withDBHelper } from "web3subscriber/src/dbhelper";
import { EventHandler } from "..";

export class EventRecorderDB extends DBHelper {
  async drop() {
    const collection = await this.getOrCreateEventCollection("l2_event");
    await collection.drop();
  }

  async saveEvent(rid: string, op: CommandOp, args: any[]) {
    const collection = await this.getOrCreateEventCollection("l2_event");
    const doc = {
      rid: rid,
      command: op,
      args: args.map(x => x.toString())
    };

    await collection.insertOne(doc);
  }

  async loadEvents() {
    const collection = await this.getOrCreateEventCollection("l2_event");
    return (await collection.aggregate([{
      "$group": {
        "_id": "$rid",
        "docs": {
          "$first": "$$ROOT"
        }
      }
    }]).toArray()).map(x => x.docs).sort(
      (e1, e2) => new BN(e1.rid).sub(new BN(e2.rid)).isNeg() ? -1 : 1
    );
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
