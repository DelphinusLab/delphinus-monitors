import { BN } from "bn.js";
import { MerkleTreeDb, local_uri, all_collections }  from "delphinus-curves/src/db";
import { Field } from "delphinus-curves/src/field";
import { MerkleTree } from "delphinus-curves/src/merkle-tree-large";
import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { L2Storage } from "delphinus-zkp/src/circom/address-space";
import { runZkp } from "delphinus-zkp/src/circom/main";
import { withDBHelper } from "web3subscriber/src/dbhelper";
import { EventRecorderDB } from "../substrate/handler/eventStorage";
import { batchSize } from "../substrate/handler/l1sync";
import { sendAlert } from "delphinus-slack-alert/src/index";
const SlackConfig = require("../../slack-alert-config.json");


async function main() {
    let treeDb = new MerkleTreeDb(local_uri, MerkleTree.dbName);

    for (const c of all_collections) {
        try {
            await treeDb.cb_on_db(db => db.dropCollection(c))
        } catch (e) {
            sendAlert(e, SlackConfig, true);
        }
    }

    await treeDb.closeMongoClient();

    console.log("tree collection dropped.");

    const storage = new L2Storage();
    const uri = await getL2EventRecorderDbUri();
    const events = await withDBHelper(
        EventRecorderDB, uri, "substrate",
        db => db.loadEvents()
    ) ?? [];

    let pendingEvents: [Field, Field[]][] = [];
    for (const e of events) {
        console.log(e)
        pendingEvents.push(
            [
                new Field(new BN(e.command)),
                e.args.map((x: string) => new Field(new BN(x)))
            ]
        );

        if (pendingEvents.length === batchSize) {
            await storage.startSnapshot(e.rid);
            await runZkp(pendingEvents, storage, e.rid, false);
            await storage.endSnapshot();

            pendingEvents = [];
        }
    }
    await storage.closeDb();
}

main();
