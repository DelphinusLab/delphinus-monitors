import { getConfigByChainName } from "delphinus-deployment/src/config";
import { L1Client, withL1Client } from "solidity/clients/client"
import { L1ClientRole } from "delphinus-deployment/src/types";
import Web3 from "web3";

const defaultAccount = '0x78e611A548121018eBe56537b25d63b9E3238b66';
async function getEthBalance(config_name: string, address: string) {
  let config = await getConfigByChainName(L1ClientRole.Monitor, config_name);
  try {
    await withL1Client(config, false, async (l1client: L1Client) => {
      await l1client.web3.web3Instance.eth.getBalance(address, function(err, result) {  
        if (err) {
          console.log(err)
        } else {
          console.log(Web3.utils.fromWei(result, "ether") + " ETH");
          if (result < Web3.utils.toWei("1", "ether")){
            throw console.warn("Your ETH amount is less than 1");
          }
        }
      });
    }); 
  } catch (err) {
    console.log("%s", err);
  };
}

getEthBalance(process.argv[2],defaultAccount).then(v => {process.exit();});