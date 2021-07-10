import BN from "bn.js";
import { dataToBN, handleReq } from "./common";
const l2address: any = require("../eth/l2address");

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
  throw Error("not implemented yet");
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
