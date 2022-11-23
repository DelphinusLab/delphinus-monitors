import { CommandOp } from "delphinus-l2-client-helper/src/swap";

export async function handleReq<T>(kv: any[], fn: (rid: string, op: CommandOp, data: any[]) => T) {
  const rid = kv[0].toString();

  if (kv[1].value.isWithdraw) {
    await fn(rid, CommandOp.Withdraw, kv[1].value.asWithdraw);
  } else if (kv[1].value.isDeposit) {
    await fn(rid, CommandOp.Deposit, kv[1].value.asDeposit);
  } else if (kv[1].value.isSwap) {
    await fn(rid, CommandOp.Swap, kv[1].value.asSwap);
  } else if (kv[1].value.isPoolSupply) {
    await fn(rid, CommandOp.Supply, kv[1].value.asPoolSupply);
  } else if (kv[1].value.isPoolRetrieve) {
    await fn(rid, CommandOp.Retrieve, kv[1].value.asPoolRetrieve);
  } else if (kv[1].value.isAddPool) {
    await fn(rid, CommandOp.AddPool, kv[1].value.asAddPool);
  } else if (kv[1].value.isSetKey) {
    await fn(rid, CommandOp.SetKey, kv[1].value.asSetKey);
  } else {
    console.log("unhandled op");
    console.log(kv[1].value);
  }
}
