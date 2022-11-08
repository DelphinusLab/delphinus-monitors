import Web3 from "web3";
import fs from "fs-extra";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";

async function main() {
  try {
    console.log('begin');
    
    //let web3 = getWeb3FromSource("https://bsc.getblock.io/testnet/?api_key=");
    let web3 = getWeb3FromSource("https://bsc.getblock.io/testnet/?api_key=");
    //let web3 = getWeb3FromSource("https://data-seed-prebsc-2-s1.binance.org:8545/");
      await web3.eth.getBlockNumber(async function(err, result) {  
        if (err) {
          throw err;
        } else {
          console.log(result);
        }
      });

  } catch (err) {
    console.log('An error has occurred ', err);
  }
}

function getWeb3FromSource(provider: string) {
    const HttpProvider = "https";
    if(provider.includes(HttpProvider)){
      return new Web3(new Web3.providers.HttpProvider(provider));
    }else {
      return new Web3(new Web3.providers.WebsocketProvider(provider));
    }
  }

main()