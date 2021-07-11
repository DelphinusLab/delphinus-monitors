import BN from "bn.js";
import { bridgeInfos } from "../bridges";
import { Verifier } from "../enums";
import { sortPoolPair } from "../sort-pool-ops-info";
const l2address: any = require("../../eth/l2address");

async function tryVerify(
  bridge: any,
  l2acc: string,
  buffer: BN[],
  b: BN,
  rid: BN
) {
  console.log("start to send to:", bridge.chain_hex_id);
  while (true) {
    try {
      let tx = await bridge.verify(l2acc, buffer, b, rid);
      console.log("done", tx.blockHash);
      return tx;
    } catch (e) {
      if (e.message == "ESOCKETTIMEDOUT") {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else if (e.message == "nonce too low") {
        console.log("failed on bsc", e.message); // not sure
        return;
      } else {
        throw e;
      }
    }
  }
}

export async function handleReq(
  opName: string,
  rid: string,
  account: string,
  nonce: BN,
  buffer: BN[]
) {
  let l2account = l2address.ss58_to_bn(account);
  console.log(`Trigger ${opName}, request id ${rid}.`);
  console.log("Start verify");
  console.log("++++++++++++++");
  buffer.forEach((v) => console.log("0x" + v.toString(16, 32)));
  console.log("++++++++++++++");

  for (let bridgeInfo of bridgeInfos) {
    await tryVerify(bridgeInfo.bridge, l2account, buffer, nonce, new BN(rid));
  }

  console.log(`Finish verify`);
}

export function dataToBN(data: any) {
  return new BN(data.toHex().replace(/0x/, ""), 16);
}

export async function handlePoolOpsReq(
    rid: string,
    account: string,
    from: BN,
    to: BN,
    amount_from: BN,
    amount_to: BN,
    nonce: BN,
    pool_amount_from: BN,
    pool_amount_to: BN,
    account_amount_from: BN,
    account_amount_to: BN,
    share: BN
  ) {
    const amountInfo = sortPoolPair(
      from, to,
      pool_amount_from, pool_amount_to,
      account_amount_from, account_amount_to
    );
    let l2account = l2address.ss58_to_bn(account);
    let buffer = [
      new BN(Verifier.PoolOps).shln(31 * 8),
      l2account,
      share,
      amountInfo.token0,
      amountInfo.token1,
      amountInfo.amount0,
      amountInfo.amount1,
      amountInfo.balance0,
      amountInfo.balance1
    ]
    return handleReq("handlePoolOpsReq", rid, account, nonce, buffer);
  }
  