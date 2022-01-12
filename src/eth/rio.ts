import {
    encodeL1address,
  } from "web3subscriber/src/addresses";
import { PlatformBase } from "./platform";

const RioTokenInfo = require("solidity/build/contracts/Rio.json");

export class Rio extends PlatformBase {
  static getChargeAddress(deviceId: string) {
    let chargeAddress = RioTokenInfo.networks[deviceId].address;
    let deviceIdHex = parseInt(deviceId).toString(16);
    let encodedChargeAddress =
      "0x" +
      encodeL1address(chargeAddress.substring(2), deviceIdHex).toString(
        16
      );
    return encodedChargeAddress;
  }
}
