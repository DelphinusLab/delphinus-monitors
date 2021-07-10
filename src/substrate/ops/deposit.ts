import BN from "bn.js";
import { Verifier } from "../enums";
import { dataToBN, handleReq } from "./common";
const l2address: any = require("../eth/l2address");

async function handleDepositReq(
  rid: string,
  account: string,
  token: BN,
  amount: BN,
  nonce: BN,
  finalAmount: BN
) {
  let l2account = l2address.ss58_to_bn(account);
  let buffer = [
    new BN(Verifier.Deposit).shln(31 * 8),
    l2account,
    token,
    finalAmount,
    amount,
  ];
  return handleReq("handleDepositReq", rid, account, nonce, buffer);
}

export function handleDepositPendingOps(rid: string, asDeposit: any[]) {
  const account = asDeposit[0].toString();
  const token = new BN(asDeposit[1].toString());
  const amount = new BN(asDeposit[2].toString());
  const nonce = new BN(asDeposit[3].toString());
  const amountRest = new BN(asDeposit[4].toString());
  return handleDepositReq(rid, account, token, amount, nonce, amountRest);
}

export function handleDepositEvent(data: any[]) {
  const id = dataToBN(data[0]);
  const account = data[1].toString();
  const token = dataToBN(data[2]);
  const amount = dataToBN(data[3]);
  const nonce = dataToBN(data[4]);
  const restAmount = dataToBN(data[5]);
  return handleDepositReq(
    id.toString(),
    account,
    token,
    amount,
    nonce,
    restAmount
  );
}
