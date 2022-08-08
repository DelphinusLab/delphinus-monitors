import { getConfigByChainName } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { checkEthBalance } from "./eth-balance-check"

async function main(chainName: string, warningAmount: string) {
    console.log("start calling");
    const defaultWarningAmount = "1";
    let checkInfo;
    let config = await getConfigByChainName(L1ClientRole.Monitor, chainName);
    if(warningAmount == undefined){
      checkInfo =  await checkEthBalance(config.rpcSource, config.monitorAccount, defaultWarningAmount);
    }else{
      checkInfo =  await checkEthBalance(config.rpcSource, config.monitorAccount, warningAmount);
    }
    if (!checkInfo[0]){
      console.log("Your ETH Balance is: " + checkInfo[1] + " ETH");
    }
  }
  
  main(process.argv[2], process.argv[3]).then(v => {process.exit();})