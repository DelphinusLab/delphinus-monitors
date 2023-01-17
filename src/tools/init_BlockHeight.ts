import Web3 from "web3";
import fs from "fs-extra";
import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";

async function main() {
  const root = require("path");
  let path;
  if(process.argv[2]){
    const absolutePath = root.resolve(process.argv[2]);
    if (!fs.existsSync(absolutePath)) {
      console.error('Directory does not exist');
      process.exit(-1);
    }
    path = absolutePath + "/blockNumberBeforeDeployment.json";
  }else{
    path = "blockNumberBeforeDeployment.json";
  }
  if (fs.existsSync(path)) {
    console.error('WARNING: blockNumberBeforeDeployment.json already exist in current directory, please delete the previous one if you want to regenerate it');
    process.exit(-1);
  }
  const { writeFileSync } = require('fs');

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
    for(let config of configs) {
      let web3 = getWeb3FromSource(config.rpcSource);
      await web3.eth.getBlockNumber(async function(err, result) {  
        if (err) {
          throw err;
        } else {
          latestBlock[config.deviceId] = result;
        }
      });
    };
    writeFileSync(path, JSON.stringify(latestBlock,null,2), 'utf8');
    console.log("Latest Block Number has been generated");
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