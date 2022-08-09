import { getConfigByChainName } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { checkDeployerAccountBalance } from "./eth-balance-check"

async function main(chainName: string, warningAmount: string) {
    console.log("start calling");
    const defaultWarningAmount = "1";
    let checkInfo;
    let config = await getConfigByChainName(L1ClientRole.Monitor, chainName);
    if(warningAmount == undefined){
      warningAmount =  defaultWarningAmount;
    };
    checkInfo =  await checkDeployerAccountBalance(config, warningAmount);
    if (!checkInfo[0]){
      console.log("Congrats: Deployer's balance is More than WarningAmount(" + warningAmount + checkInfo[2] + ")");
      console.log("Deployer's balance: " + checkInfo[1] + checkInfo[2]);
    }
  }
  
  main(process.argv[2], process.argv[3]).then(v => {process.exit();})