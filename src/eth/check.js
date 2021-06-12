const Web3 = require("web3")
const FileSys = require("fs")
const EthConfig = require('../../config/ethconfig');
const Bridge = require('./abi');

let web3 = new Web3(EthConfig.web3_source);

function get_contract(abi_file) {
  let abi_data = FileSys.readFileSync(abi_file);
  let data_json = JSON.parse(abi_data);
  let abi_json = data_json.abi;
  let address = data_json.networks[EthConfig.device_id].address;
  let contract = new web3.eth.Contract(abi_json, address, {
    from:EthConfig.monitor_account
  });
  return contract;
}
let token = get_contract(EthConfig.contracts + "/TOKEN.json");
let bridge = get_contract(EthConfig.contracts + "/Bridge.json");

async function test_main() {
  console.log("start calling");
  try {
    let l2account = "0x7a50c8fa50a39bd48dfd8053ebff44ba3da45dd8c3e90a5fec9fd73a4595251b";
    let l1account = await bridge.methods.getAddress().call();
    let token_address = token.options.address;
    let bridge_address = bridge.options.address;

    let balance = await token.methods.balanceOf(l1account).call();
    console.log("balance is", balance);
    let token_id = Bridge.encode_address(token_address);
    console.log(token_address, token_id.toString(16));
    balance = await bridge.methods.balanceOf(l2account, token_id).call();
    console.log("balance in bridge is", balance);

  } catch (err) {
    console.log("%s", err);
  }
}

test_main().then(v => console.log("test done!"));
