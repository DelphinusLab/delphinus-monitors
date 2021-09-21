const ss58 = require("substrate-ss58");
console.log("sudo Id is " + ss58.addressToAddressId(process.argv[1]));