import BN from "bn.js";
import { Verifier } from "../enums";
import { dataToBN, writeDB } from "./common";
const l2address: any = require("../../eth/l2address");

async function handleDepositReq(
  rid: string,
  account: string,
  token: string,
  amount: string,
  nonce: string,
  finalAmount: string
) {
  return writeDB("deposit", {
    account: account,
    amount: amount,
    finalAmount: finalAmount,
  });
}

export async function handleDepositPendingOps(rid: string, asDeposit: any[]) {
  const account = asDeposit[0].toString();
  const token = asDeposit[1].toString();
  const amount = asDeposit[2].toString();
  const nonce = asDeposit[3].toString();
  const amountRest = asDeposit[4].toString();
  return handleDepositReq(rid, account, token, amount, nonce, amountRest);
}

export async function handleDepositEvent(data: any[]) {
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
