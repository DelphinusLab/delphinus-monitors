const { addressIdToAddress, addressToAddressId } = require('substrate-ss58');
const Web3 = require("web3");
const BigNumber = Web3.utils.BN;

function bn_to_ss58(bn) {
  let hex_str = (new BigNumber(bn)).toString(16)
  let r = "";
  for (i=0; i< 64 - hex_str.length; i++) {
    r += "0";
  }
  r = r + hex_str;
  return addressIdToAddress(r);
}

function ss58_to_bn(ss58) {
  let hex = addressToAddressId(ss58);
  return (new BigNumber(hex.substring(2), 'hex'));
}

module.exports = {
  bn_to_ss58: bn_to_ss58,
  ss58_to_bn: ss58_to_bn
}
