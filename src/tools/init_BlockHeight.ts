import Web3 from "web3";
import fs from "fs-extra";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";

async function main() {
  const path = '../../../../blockNumberBeforeDeployment.json';
  const { writeFileSync } = require('fs');
  // if (!fs.existsSync(__dirname + '/../../../../../zkcross-lerna1')) {
  //   throw console.error('error');
  // }
  interface bnInfo {
    [key: string]: any
  }
  const latestBlock: bnInfo = {};

  const configs = await getEnabledEthConfigs(L1ClientRole.Monitor);
  if (configs.length === 0) {
    console.error("Error: No config detected.");
    process.exit(-1);
  }
  try {
    if (!fs.existsSync(__dirname + '/../../../../../zkcross-lerna')) {
      throw console.error('zkcross-lerna does not exist');
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
    writeFileSync(path, JSON.stringify(latestBlock,null,2), 'utf8');
    console.log("Latest Block Number has been generated");
  } catch (error) {
    if(error != undefined){
      console.log('An error has occurred ', error);
    }
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