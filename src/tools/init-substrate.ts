import { SubstrateClient, withL2Client } from "../substrate/client";
import { encodeL1address } from "web3subscriber/src/addresses";
import { getTokenIndex } from "delphinus-deployment/src/token-index";
import { Tokens } from "solidity/clients/contracts/tokenlist";
import { extraTokens} from "delphinus-deployment/config/extratokens";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { BN } from "bn.js";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";

function crunchTokens() {
  return Tokens.concat(extraTokens)
    .filter((x: any) => x.address)
    .map((x: any) => {return {...x,
        address:encodeL1address(x.address, parseInt(x.chainId).toString(16))
    }});
}

async function main() {
  const configs = await getEnabledEthConfigs(L1ClientRole.Monitor);

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
          const tokenIndexMap = getTokenIndex();
          const tokens = crunchTokens();
          for (let i = 0; i < tokens.length; i++) {
            for (let j = i + 1; j < tokens.length; j++) {
              if (tokens[i].name === tokens[j].name &&
                    tokens[i].chainId !== tokens[j].chainId) {
                console.log("pair:", tokens[i], tokens[j]);
                let tx = await l2client.swapHelper.addPool(
                  new BN(tokenIndexMap[tokens[i].address]),
                  new BN(tokenIndexMap[tokens[j].address]),
                  new BN(nonce++)
                );
                console.log(tx);
              }
            }
          }
        }
      },
      false
    );
  });
}

main();
