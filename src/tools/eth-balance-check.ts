import Web3 from "web3";

export async function checkEthBalance(provider: string, address: string) {
  console.log("checking eth balance")
  const web3 = new Web3(new Web3.providers.HttpProvider(provider));
  await web3.eth.getBalance(address, function(err, result) {  
    if (err) {
      console.log(err)
    } else {
      if (parseInt(result, 10) < parseInt(Web3.utils.toWei("1", "ether"), 10)){
        console.log("Warning: Your ETH Balance is less than 1");
        console.log("Your current ETH balance is: " + Web3.utils.fromWei(result, "ether") + " ETH");
      }
    }
  });
}