import { SubstrateClient, withL2Client } from "../substrate/client";
import { getTokenIndex } from "delphinus-deployment/src/token-index";
import { derive_private_key, get_public_key } from "delphinus-crypto";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { SwapHelper } from "delphinus-l2-client-helper/src/swap";
import { BN } from "bn.js";
import { getLocalEthConfig } from "delphinus-deployment/src/local/eth-config";

async function main() {
  const configs = await getLocalEthConfig(L1ClientRole.Monitor);

  if (configs.length === 0) {
    console.error("Error: No config detected.");
    process.exit(-1);
  }

  configs.forEach((config, i) => {
    withL2Client(config.l2Account, async (l2client: SubstrateClient) => {
      // 1. Set keys for all admin account
      const derivedL2AccountPubKey = get_public_key(
        l2client.swapHelper.privateKey
      );
      await l2client.swapHelper.setKey(derivedL2AccountPubKey);

      // 2. Add pools
      if (i === 0) {
        let nonce = 0;
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
    });
  });
}

main();
