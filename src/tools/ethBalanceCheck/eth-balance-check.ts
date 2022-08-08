import Web3 from "web3";
import { ChainConfig } from "delphinus-deployment/src/types";

export async function checkDeploymentAccountEthBalance(config: ChainConfig, warningAmount: string){
  if (config.privateKey === "") {
    return checkEthBalance(config.wsSource, config.monitorAccount, warningAmount);
  } else {
    return checkEthBalance(config.rpcSource, config.monitorAccount, warningAmount);
  }
}

export async function checkEthBalance(providerSource: string, address: string, warningAmount: string) {
  let ethBalanceWarning = false;
  let balance;
  const web3 = getWeb3FromSource(providerSource);
  await web3.eth.getBalance(address, function(err, result) {  
    if (err) {
      console.log(err)
    } else {
      balance = Web3.utils.fromWei(result, "ether");
      if (parseInt(result, 10) < parseInt(Web3.utils.toWei(warningAmount, "ether"), 10)){
        ethBalanceWarning = true;
        console.log("Warning: Your ETH Balance is less than " + warningAmount + " ETH");
        console.log("Your current ETH balance: " + balance + " ETH");
      }
    }
  });
  return [ethBalanceWarning, balance]
}

function getWeb3FromSource(provider: string) {
  const HttpProvider = "https";
  if(provider.includes(HttpProvider)){
    return new Web3(new Web3.providers.HttpProvider(provider));
  }else {
    return new Web3(new Web3.providers.WebsocketProvider(provider));
  }
}