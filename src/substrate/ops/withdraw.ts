import BN from "bn.js";
import { Verifier } from "../enums";
import { dataToBN, handleReq } from "./common";
const l2address: any = require("../../eth/l2address");

async function handleWithdrawReq(
  rid: string,
  account: string,
  l1account: BN,
  token: BN,
  amount: BN,
  nonce: BN,
  finalAmount: BN
) {
  let l2account = l2address.ss58_to_bn(account);
  let buffer = [
    new BN(Verifier.Withdraw).shln(31 * 8),
    l2account,
    token,
    finalAmount,
    l1account,
    amount,
  ];
  return handleReq("handleWithdrawReq", rid, account, nonce, buffer);
}

export async function handleWithdrawPendingOps(rid: string, asWithdraw: any[]) {
  let cursor = 0;
  const account = asWithdraw[cursor++].toString();
  const l1account = new BN(asWithdraw[cursor++].toString());
  const token = new BN(asWithdraw[cursor++].toString());
  const amount = new BN(asWithdraw[cursor++].toString());
  const nonce = new BN(asWithdraw[cursor++].toString());
  const amountRest = new BN(asWithdraw[cursor++].toString());
  return handleWithdrawReq(
    rid,
    account,
    l1account,
    token,
    amount,
    nonce,
    amountRest
  );
}

export async function handleWithdrawEvent(data: any[]) {
  const id = dataToBN(data[0]);
  const account = data[1].toString();
  const l1account = dataToBN(data[2]);
  const token = dataToBN(data[3]);
  const amount = dataToBN(data[4]);
  const nonce = dataToBN(data[5]);
  const restAmount = dataToBN(data[6]);
  return handleWithdrawReq(
    id.toString(),
    account,
    l1account,
    token,
    amount,
    nonce,
    restAmount
  );
}
