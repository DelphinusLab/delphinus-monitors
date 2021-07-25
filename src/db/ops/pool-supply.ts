import BN from "bn.js";
import { dataToBN, writeDB } from "./common";

async function handlePoolOpsReq(
    rid: string,
    account: string,
    from: string,
    to: string,
    amount_from: string,
    amount_to: string,
    nonce: string,
    pool_amount_from: string,
    pool_amount_to: string,
    account_amount_from: string,
    account_amount_to: string,
    share: string
  ) {
    return writeDB("pool_supply", {
      account: account, 
      from: from,
      to: to,
      pool_amount_from: pool_amount_from,
      pool_amount_to: pool_amount_to,
  });
}

export async function handlePoolSupplyPendingOps(rid: string, asPoolSupply: any[]) {
    let cursor = 0;
    const account = asPoolSupply[cursor++].toString();
    const from = new BN(asPoolSupply[cursor++].toString());
    const to = new BN(asPoolSupply[cursor++].toString());
    const amount_from = new BN(asPoolSupply[cursor++].toString());
    const amount_to = new BN(asPoolSupply[cursor++].toString());
    const nonce = new BN(asPoolSupply[cursor++].toString());
    const pool_amount_from = new BN(asPoolSupply[cursor++].toString());
    const pool_amount_to = new BN(asPoolSupply[cursor++].toString());
    const account_amount_from = new BN(asPoolSupply[cursor++].toString());
    const account_amount_to = new BN(asPoolSupply[cursor++].toString());
    const share = new BN(asPoolSupply[cursor++].toString());

    return handlePoolOpsReq(
      rid,
      account,
      from,
      to,
      amount_from,
      amount_to,
      nonce,
      pool_amount_from,
      pool_amount_to,
      account_amount_from,
      account_amount_to,
      share
    );
}

export async function handlePoolSupplyEvent(data: any[]) {
    let cursor = 0;
    const rid = dataToBN(data[cursor++]).toString();
    const account = data[cursor++].toString();
    const from = dataToBN(data[cursor++]);
    const to = dataToBN(data[cursor++]);
    const amount_from = dataToBN(data[cursor++]);
    const amount_to = dataToBN(data[cursor++]);
    const nonce = dataToBN(data[cursor++]);
    const pool_amount_from = dataToBN(data[cursor++]);
    const pool_amount_to = dataToBN(data[cursor++]);
    const account_amount_from = dataToBN(data[cursor++]);
    const account_amount_to = dataToBN(data[cursor++]);
    const share = dataToBN(data[cursor++]);

    return handlePoolOpsReq(
      rid,
      account,
      from,
      to,
      amount_from,
      amount_to,
      nonce,
      pool_amount_from,
      pool_amount_to,
      account_amount_from,
      account_amount_to,
      share
    );
}
