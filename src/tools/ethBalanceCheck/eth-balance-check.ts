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
  let balanceWarning = false;
  let balance;
  const web3 = getWeb3FromSource(providerSource);
  const address = web3.eth.accounts.privateKeyToAccount(privateKey).address;
  const currencySymbol = await getNativeCurrencySymbolByChainId(ChainId);
  await web3.eth.getBalance(address, function(err, result) {  
    if (err) {
      console.log(err)
    } else {
      balance = Web3.utils.fromWei(result, "ether");
      if (parseInt(balance, 10) < parseInt(warningAmount, 10)){
        balanceWarning = true;
        console.log("Warning: Deployer's balance is less than WarningAmount(" + warningAmount + " " + currencySymbol + ")");
        console.log("Deployer's balance: " + balance + " " + currencySymbol);
      }
    }
  });
  return [balanceWarning, balance, currencySymbol]
}

export function getWeb3FromSource(provider: string) {
  const HttpProvider = "https";
  if(provider.includes(HttpProvider)){
    return new Web3(new Web3.providers.HttpProvider(provider));
  }else {
    return new Web3(new Web3.providers.WebsocketProvider(provider));
  }
}

export async function getNativeCurrencySymbolByChainId(chainId: string){
  const chainInfo = await getChainInfoByChainID(chainId);
  if(chainInfo == undefined){
    return "unknown token";
  }else{
    return chainInfo.nativeCurrency.symbol;
  }
}

export async function getChainInfoByChainID(chainId:string) {
  const fetch = require("node-fetch");
  const allConfigs = await (await fetch("https://chainid.network/chains.json", {timeout:10000})).json();
  let configInfo = await allConfigs.find((config:any) => config.chainId == parseInt(chainId));
  return configInfo;
}