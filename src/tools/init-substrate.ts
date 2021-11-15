// Used to init substarte env by
// 1. Create init token and pool
// 2. TBD

import { SubstrateClient, withL2Client } from "../substrate/client";
import { getTokenIndex } from "delphinus-deployment/src/token-index";

async function main() {
  await withL2Client(3, async (l2client: SubstrateClient) => {
    let nonce = 0;
    let tokenIndex = getTokenIndex();

    for (let i = 0; i < Object.entries(tokenIndex).length; i++) {
      for (let j = i + 1; j < Object.entries(tokenIndex).length; j++) {
        await l2client.send(
          "addPool",
          Object.entries(tokenIndex)[i][1],
          Object.entries(tokenIndex)[j][1],
          nonce++
        );
      }
    }
  });
}

main();
