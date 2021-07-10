import BN from "bn.js";
import { dataToBN, handlePoolOpsReq } from "./common";

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

    await handlePoolOpsReq(
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
