import BN from "bn.js";
import { CommandOp, L2Storage } from "delphinus-zkp/src/business/command";
import { runZkp } from "delphinus-zkp/src/business/main";
import { Field } from "delphinus-zkp/node_modules/delphinus-curves/src/field";
import { dataToBN } from "./common";

async function handleDepositReq(
  storage: L2Storage,
  rid: string,
  accountIndex: BN,
  tokenIndex: BN,
  amount: BN,
  nonce: BN
) {
  return runZkp(
    new Field(CommandOp.Deposit),
    [accountIndex, tokenIndex, amount].map((x) => new Field(x)),
    storage
  );
}

export function handleDepositPendingOps(
  rid: string,
  asDeposit: any[],
  storage: L2Storage
) {
  const accountIndex = dataToBN(asDeposit[0]);
  const tokenIndex = dataToBN(asDeposit[1]);
  const amount = dataToBN(asDeposit[2]);
  const nonce = dataToBN(asDeposit[3]);
  return handleDepositReq(
    storage,
    rid,
    accountIndex,
    tokenIndex,
    amount,
    nonce
  );
}

export function handleDepositEvent(data: any[], storage: L2Storage) {
  const id = data[0].toString();
  const accountIndex = dataToBN(data[1]);
  const tokenIndex = dataToBN(data[2]);
  const amount = dataToBN(data[3]);
  const nonce = dataToBN(data[4]);
  return handleDepositReq(storage, id, accountIndex, tokenIndex, amount, nonce);
}
