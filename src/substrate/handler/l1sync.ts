import BN from "bn.js";
import { runZkp } from "delphinus-zkp/src/zokrates/main";
import { CommandOp, L2Storage } from "delphinus-zkp/src/zokrates/command";
import { Field } from "delphinus-curves/src/field";
import { withL1Client, L1Client } from "solidity/clients/client";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { dataToBN } from "../client";
import { EventHandler } from "..";

async function withL2Storage<t>(cb: (_: L2Storage) => Promise<t>) {
  let l2Storage = new L2Storage();

  try {
    return await cb(l2Storage);
  } finally {
    await l2Storage.closeDb();
  }
}

async function preHandler(commitedRid: BN) {
  await withL2Storage(async (storage: L2Storage) => {
    console.log("checkout db snapshot to", commitedRid.toString(10));
    await storage.loadSnapshot(commitedRid.toString(10));
  });
}

async function verify(
  l1client: L1Client,
  l2Account: string,
  command: BN[],
  proof: BN[],
  rid: BN,
  vid: number = 0
) {
  console.log("start to send to:", l1client.getChainIdHex());
  while (true) {
    let txhash = "";
    try {
      let bridge = l1client.getBridgeContract();
      let metadata = await bridge.getMetaData();
      if (new BN(metadata.bridgeInfo.rid).gte(rid)) {
        return;
      }

      /**
       * TODO: The exception behavior (e.g. network delay) will cause
       * the following statement to be executed multiple times,
       * thus consuming additional gas fee.
       *
       * We may introduce a db to filter out extra invoking.
       * 1. save (rid, txhash) into db
       * 2. check if the rid exists in the db
       * 3. get hash from db, and check if it is pending in eth
       */
      let tx = bridge.verify("0", command, proof, vid, 0, rid);
      let r = await tx.when("Verify", "transactionHash", (hash: string) => {
        console.log("Get transactionHash", hash);
        txhash = hash;
      });
      console.log("done", r.blockHash);
      return r;
    } catch (e: any) {
      if (txhash !== "") {
        console.log("exception with transactionHash ready", " will retry ...");
        console.log("exception with transactionHash ready", " will retry ...");
        throw e;
      } else {
        if (e.message == "ESOCKETTIMEDOUT") {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else if (e.message == "nonce too low") {
          console.log("failed on:", l1client.getChainIdHex(), e.message); // not sure
          return;
        } else {
          console.log("Unhandled exception during verify");
          console.log(e);
          throw e;
        }
      }
    }
  }
}

async function l1SyncHandler(rid: string, op: CommandOp, args: any[]) {
  await withL2Storage(async (storage: L2Storage) => {
    await storage.startSnapshot(rid);

    /**
     * TODO: we can save proof in the filesystem, thus
     * recover interrupted rid can skip generating proof.
     */
    const proof = await runZkp(
      new Field(op),
      args.map((x) => new Field(dataToBN(x))),
      storage
    );

    console.log(proof);

    const commandBuffer = [new BN(op)].concat(
      // Fill padding to 8
      args.concat(Array(8).fill(new BN(0))).slice(0, 8)
    );

    const proofBuffer = proof.map(dataToBN);

    console.log("----- verify args -----");
    console.log(commandBuffer);
    console.log(proofBuffer);
    console.log("----- verify args -----");

    for (const config of await getEnabledEthConfigs(L1ClientRole.Monitor)) {
      await withL1Client(config, false, (l1client: L1Client) => {
        return verify(
          l1client,
          "",
          commandBuffer,
          proofBuffer,
          new BN(rid, 10)
        );
      });
    }

    console.log("before end snapshot", rid);
    await storage.endSnapshot();
    console.log("after end snapshot", rid);
  });
}

export const handler: EventHandler = {
  preHandler: preHandler,
  eventHandler: l1SyncHandler,
};
