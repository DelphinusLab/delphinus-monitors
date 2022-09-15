import Web3 from "web3";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";

async function main() {
    const { writeFileSync } = require('fs');
    const path = '../../../web3subscriber/blockNumberBeforeDeployment.json';
    interface bnInfo {
        [key: string]: any
      }
    const latestBlock: bnInfo = {};

    const configs = await getEnabledEthConfigs(L1ClientRole.Monitor);
    if (configs.length === 0) {
        console.error("Error: No config detected.");
        process.exit(-1);
    } 
    for(let config of configs) {
        let web3 = getWeb3FromSource(config.rpcSource);
        await web3.eth.getBlockNumber(async function(err, result) {  
            if (err) {
                console.log(err);
                throw err;
            } else {
                latestBlock[config.deviceId] = result;
            }
          });
    };
    try {
        writeFileSync(path, JSON.stringify(latestBlock,null,2), 'utf8');
        } catch (error) {
        console.log('An error has occurred ', error);
    }
    console.log("Latest Block Number has been generated")
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