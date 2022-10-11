import Web3 from "web3";
import fs from "fs-extra";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";

async function main() {
  try {
    console.log('begin');
    
    //let web3 = getWeb3FromSource("https://bsc.getblock.io/testnet/?api_key=5a14a6c9-1b19-407d-8a77-4bef171b3563");
    let web3 = getWeb3FromSource("https://bsc.getblock.io/testnet/?api_key=dca9bd0a-0ce4-4b83-a4ad-2c05f66c04e2");
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