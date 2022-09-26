import { getConfigByChainName } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { checkDeployerAccountBalance, getChainInfoByChainID } from "./eth-balance-check"

async function main(chainName: string, warningAmount: string) {
    console.log("start calling");
    let checkInfo;
    const config = await getConfigByChainName(L1ClientRole.Monitor, chainName);
    if(warningAmount == undefined){
      warningAmount =  config.gasWarningAmount;
    };
    checkInfo =  await checkDeployerAccountBalance(config, warningAmount);
    if (!checkInfo[0]){
      console.log("Congrats: Deployer's balance is More than WarningAmount(" + warningAmount + " " + checkInfo[2] + ")");
      console.log("Deployer's balance: " + checkInfo[1] + " " + checkInfo[2]);
    }

    const configInfo = await getChainInfoByChainID(config.deviceId);
    if(configInfo == undefined){
      console.log("======================== Chain Info =========================");
    }else{
      console.log("======================== Chain Info =========================");
      console.log("Chain Name:", configInfo.name);
      console.log("Chain ID:", configInfo.chainId);
      console.log("Network ID:", configInfo.networkId);
      console.log("INFO URL:", configInfo.infoURL);
      console.log("Native Currency Name:", configInfo.nativeCurrency.name);
      console.log("Native Currency symbol:", configInfo.nativeCurrency.symbol);
      console.log("Native Currency decimals:", configInfo.nativeCurrency.decimals);
    }
  }
  
  main(process.argv[2], process.argv[3]).then(v => {process.exit();})