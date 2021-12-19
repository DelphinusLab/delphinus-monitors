import { SubstrateClient, withL2Client } from "../substrate/client";
import { getTokenIndex } from "delphinus-deployment/src/token-index";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { BN } from "bn.js";
import { getLocalEthConfig } from "delphinus-deployment/src/local/eth-config";

async function main() {
  const configs = await getLocalEthConfig(L1ClientRole.Monitor);

  if (configs.length === 0) {
    console.error("Error: No config detected.");
    process.exit(-1);
  }

  configs.forEach((config, i) => {
    withL2Client(
      config.l2Account,
      async (l2client: SubstrateClient) => {
        // 1. Set keys for all admin account
        await l2client.swapHelper.setKey();

        // 2. Add pools
        if (i === 0) {
          let nonce = 1;
          const tokenIndex = getTokenIndex();
          for (let i = 0; i < Object.entries(tokenIndex).length; i++) {
            for (let j = i + 1; j < Object.entries(tokenIndex).length; j++) {
              await l2client.swapHelper.addPool(
                new BN(Object.entries(tokenIndex)[i][1]),
                new BN(Object.entries(tokenIndex)[j][1]),
                new BN(nonce++)
              );
            }
          }
        }
      },
      false
    );
  });
}

main();
