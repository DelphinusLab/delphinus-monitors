// Used to init substarte env by
// 1. Create init token and pool
// 2. TBD

import { SubstrateClient, withL2Client } from "../substrate/client";
import L1TokenInfo from "solidity/clients/token-index.json";

const tokenInfo = L1TokenInfo;

async function main() {
  await withL2Client(3, async (l2client: SubstrateClient) => {
    let nonce = 0;

    for (let i = 0; i < Object.entries(tokenInfo).length; i++) {
      for (let j = i + 1; j < Object.entries(tokenInfo).length; j++) {
        await l2client.send(
          "addPool",
          Object.entries(tokenInfo)[i][1],
          Object.entries(tokenInfo)[j][1],
          nonce++
        );
      }
    }
  });
}

main();
