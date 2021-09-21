import BN from "bn.js";
import { Field } from "delphinus-zkp/node_modules/delphinus-curves/src/field";
import { CommandOp, L2Storage } from "delphinus-zkp/src/business/command";
import { runZkp } from "delphinus-zkp/src/business/main";
import { dataToBN } from "./common";
const l2address: any = require("../../eth/l2address");

export async function handleWithdrawOp(rid: string, asWithdraw: any[], 
  storage: L2Storage) {
  let cursor = 0;
  const accountIndex = dataToBN(asWithdraw[cursor++]);
  const l1Address = dataToBN(asWithdraw[cursor++]);
  const tokenIndex = dataToBN(asWithdraw[cursor++]);
  const amount = dataToBN(asWithdraw[cursor++]);
  const nonce = dataToBN(asWithdraw[cursor++]);
  
  return runZkp(
    new Field(CommandOp.Withdraw),
    [0, 0, 0, accountIndex, tokenIndex, amount, l1Address].map((x) => new Field(x)),
    storage
  );
}

export async function handleWithdrawEvent(
  data: any[], 
  storage: L2Storage
) {
  const rid = data[0].toString();
  return handleWithdrawOp(rid, data.slice(1), storage);
}
