import BN from "bn.js";
import { Verifier } from "../enums";
import { sortPoolPair } from "../sort-pool-ops-info";
import { dataToBN, handleReq } from "./common";
const l2address: any = require("../../eth/l2address");

async function handleSwapReq(
  rid: string,
  account: string,
  from: BN,
  to: BN,
  amount: BN,
  nonce: BN,
  pool_amount_from: BN,
  pool_amount_to: BN,
  account_amount_from: BN,
  account_amount_to: BN
) {
  const amountInfo = sortPoolPair(
    from, to,
    pool_amount_from, pool_amount_to,
    account_amount_from, account_amount_to
  );
  let l2account = l2address.ss58_to_bn(account);
  let buffer = [
    new BN(Verifier.Swap).shln(31 * 8),
    l2account,
    amountInfo.token0,
    amountInfo.token1,
    amountInfo.amount0,
    amountInfo.amount1,
    amountInfo.balance0,
    amountInfo.balance1
  ]
  return handleReq("handleSwapReq", rid, account, nonce, buffer);
}

export async function handleSwapPendingOps(rid: string, asSwap: any[]) {
  let cursor = 0;
  const account = asSwap[cursor++].toString();
  const from = new BN(asSwap[cursor++].toString());
  const to = new BN(asSwap[cursor++].toString());
  const amount = new BN(asSwap[cursor++].toString());
  const nonce = new BN(asSwap[cursor++].toString());
  const pool_amount_from = new BN(asSwap[cursor++].toString());
  const pool_amount_to = new BN(asSwap[cursor++].toString());
  const account_amount_from = new BN(asSwap[cursor++].toString());
  const account_amount_to = new BN(asSwap[cursor++].toString());

  return handleSwapReq(
    rid,
    account,
    from,
    to,
    amount,
    nonce,
    pool_amount_from,
    pool_amount_to,
    account_amount_from,
    account_amount_to
  );
}

export async function handleSwapEvent(data: any[]) {
  let cursor = 0;
  const rid = dataToBN(data[cursor++]).toString();
  const account = data[cursor++].toString();
  const from = dataToBN(data[cursor++]);
  const to = dataToBN(data[cursor++]);
  const amount = dataToBN(data[cursor++]);
  const nonce = dataToBN(data[cursor++]);
  const pool_amount_from = dataToBN(data[cursor++]);
  const pool_amount_to = dataToBN(data[cursor++]);
  const account_amount_from = dataToBN(data[cursor++]);
  const account_amount_to = dataToBN(data[cursor++]);

  await handleSwapReq(
    rid,
    account,
    from,
    to,
    amount,
    nonce,
    pool_amount_from,
    pool_amount_to,
    account_amount_from,
    account_amount_to
  );
}
