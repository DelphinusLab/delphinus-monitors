import { Keyring } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
const ss58 = require("substrate-ss58");
const accountConfig = require("delphinus-deployment/config/substrate-account-config.json");

async function getAccountConfig() {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: "sr25519" });

  //admins
  let secretKeyUri = accountConfig.secret_key_uri;
  let admins = "vec![";
  for(var i = 0; i < secretKeyUri.length; i++) {
    let pubKey = ss58.addressToAddressId(keyring.addFromUri(secretKeyUri[i]).address);
    if(i != secretKeyUri.length - 1) {
      admins = admins + "AccountId::from(hex_literal::hex![\"" + pubKey.slice(2) + "\"]),";
    } else {
      admins = admins + "AccountId::from(hex_literal::hex![\"" + pubKey.slice(2) + "\"])]";
    }
  }
  
  //authorities_seeds  
  let authSeeds = accountConfig.authorities_seeds;
  let authorities_seeds = "authorities_seeds: \\&[";
  for(var i = 0; i <authSeeds.length; i++) {
    if(i != authSeeds.length - 1) {
      authorities_seeds = authorities_seeds + "\"" + authSeeds[i] + "\",";
    } else 
      authorities_seeds = authorities_seeds + "\"" + authSeeds[i] + "\"],";
  }

  //pre_funded_seeds
  let preSeeds = accountConfig.pre_funded_seeds;
  let pre_funded_seeds = "pre_funded_seeds: \\&[";
  for(var i = 0; i <authSeeds.length; i++) {
    if(i != preSeeds.length - 1) {
      pre_funded_seeds = pre_funded_seeds + "\"" + preSeeds[i] + "\",";
    } else 
      pre_funded_seeds = pre_funded_seeds + "\"" + preSeeds[i] + "\"],";
  }
  
  //sudo_account_seeds
  let sudo_account_seed = "sudo_account_seed: \"" + accountConfig["sudo_account_seed"] + "\"";

  console.log(admins);
  console.log(authorities_seeds);
  console.log(pre_funded_seeds);
  console.log(sudo_account_seed);
}

getAccountConfig();
