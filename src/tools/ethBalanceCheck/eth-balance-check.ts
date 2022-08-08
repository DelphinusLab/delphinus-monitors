import Web3 from "web3";

export async function checkEthBalance(provider: string, address: string, warningAmount: string) {
  let ethBalanceWarning = false;
  let balance;
  const web3 = new Web3(new Web3.providers.HttpProvider(provider));
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