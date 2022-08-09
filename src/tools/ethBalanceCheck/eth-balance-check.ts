import Web3 from "web3";
import { ChainConfig } from "delphinus-deployment/src/types";

export async function checkDeployerAccountBalance(config: ChainConfig, warningAmount: string){
  if (config.privateKey === "") {
    return checkEthBalance(config.wsSource, config.privateKey, config.deviceId, warningAmount);
  } else {
    return checkEthBalance(config.rpcSource, config.privateKey, config.deviceId, warningAmount);
  }
}

export async function checkEthBalance(providerSource: string, privateKey: string, ChainId: string, warningAmount: string) {
  let ethBalanceWarning = false;
  let balance;
  const web3 = getWeb3FromSource(providerSource);
  console.log("Deployer's privateKey: " + privateKey);
  const address = web3.eth.accounts.privateKeyToAccount(privateKey).address;
  const currentSymbol = getNativeCurrencySymbolByChainId(ChainId);
  console.log("Deployer's address: " + address);
  await web3.eth.getBalance(address, function(err, result) {  
    if (err) {
      console.log(err)
    } else {
      balance = Web3.utils.fromWei(result, "ether");
      if (parseInt(balance, 10) < parseInt(warningAmount, 10)){
        ethBalanceWarning = true;
        console.log("Warning: Deployer's balance is less than " + warningAmount + currentSymbol);
        console.log("Current balance: " + balance + currentSymbol);
      }
    }
  });
  return [ethBalanceWarning, balance, currentSymbol]
}

function getWeb3FromSource(provider: string) {
  const HttpProvider = "https";
  if(provider.includes(HttpProvider)){
    return new Web3(new Web3.providers.HttpProvider(provider));
  }else {
    return new Web3(new Web3.providers.WebsocketProvider(provider));
  }
}

function getNativeCurrencySymbolByChainId(chainId: string){
  if(chainId == "97"){
    return " tBNB";
  }else if(chainId == "3"){
    return " ROP";
  }else if (chainId == "338"){
    return " TCRO";
  }else{
    return " Unkown Token"
  }
}