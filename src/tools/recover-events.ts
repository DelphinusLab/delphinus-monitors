import { getL2EventRecorderDbUri } from "delphinus-deployment/src/config";
import { withDBHelper } from "web3subscriber/src/dbhelper";
import { withL2QueryClient } from "../substrate/client";
import { EventRecorderDB } from "../substrate/handler/eventStorage";
import { handleReq } from "../substrate/swapUtils";

async function main() {
    const events =
        await withL2QueryClient(
            async client => client.getCompleteReqs()
        );

    const uri = await getL2EventRecorderDbUri();
    await withDBHelper(
        EventRecorderDB, uri, "substrate",
        db => db.drop()
    );

    await withDBHelper(
        EventRecorderDB, uri, "substrate",
        async db => {
            for (const e of events) {
                await handleReq(e, async (rid, op, data) => await db.saveEvent.bind(db)(rid, op, data));
            }
        }
    );
}

main();
