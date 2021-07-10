import BN from "bn.js";

import substrateNode from "../../config/substrate-node.json";
import { SubstrateClient } from "./client";
import { EventQueue } from "./event-queue";

const ETHConfig: any = require("solidity/clients/config");
const abi: any = require("solidity/clients/bridge/abi");
const l2address: any = require("../eth/l2address");

let bridge1: any;
let bridge2: any;

const SECTION_NAME = "swapModule";

function dataToBN(data: any) {
  return new BN(data.toHex().replace(/0x/, ""), 16);
}

async function try_verify(bridge: any, l2acc: string, buffer: BN[], b: BN, rid: BN) {
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

enum Verifier {
  Withdraw = 0,
  Deposit = 1,
  PoolOps = 2
}

interface PoolOpsAmountInfo {
  token0: BN;
  token1: BN;
  amount0: BN;
  amount1: BN;
  balance0: BN;
  balance1: BN;
}

function sortPoolPair(
  from: BN,
  to: BN,
  amount_from: BN,
  amount_to: BN,
  pool_amount_from: BN,
  pool_amount_to: BN,
  account_amount_from: BN,
  account_amount_to: BN
) {
  if (from < to) {
    return {
      token0: from,
      token1: to,
      amount0: pool_amount_from,
      amount1: pool_amount_to,
      balance0: account_amount_from,
      balance1: account_amount_to
    }
  }

  return {
    token1: from,
    token0: to,
    amount1: pool_amount_from,
    amount0: pool_amount_to,
    balance1: account_amount_from,
    balance0: account_amount_to
  }
}

async function handleReq(
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

  await try_verify(bridge1, l2account, buffer, nonce, new BN(rid));
  await try_verify(bridge2, l2account, buffer, nonce, new BN(rid));

  console.log(`Finish verify`);
}

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
  let buffer = [new BN(Verifier.Withdraw), l2account, token, finalAmount, l1account, amount];
  return handleReq("handleWithdrawReq", rid, account, nonce, buffer);
}

async function handleDepositReq(
  rid: string,
  account: string,
  token: BN,
  amount: BN,
  nonce: BN,
  finalAmount: BN
) {
  let l2account = l2address.ss58_to_bn(account);
  let buffer = [new BN(Verifier.Deposit).shln(31 * 8), l2account, token, finalAmount, amount];
  return handleReq("handleDepositReq", rid, account, nonce, buffer);
}

async function handleSwapReq(
  client: SubstrateClient,
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

async function handlePoolOpsReq(
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
    amount_from, amount_to,
    pool_amount_from, pool_amount_to,
    account_amount_from, account_amount_to
  );
  let l2account = l2address.ss58_to_bn(account);
  let buffer = [
    new BN(Verifier.PoolOps),
    l2account,
    share,
    amountInfo.token0,
    amountInfo.token1,
    amountInfo.amount0,
    amountInfo.amount1,
    amountInfo.balance0,
    amountInfo.balance1
  ]
  return handleReq("handlePoolSupplyReq", rid, account, nonce, buffer);
}

class TransactionQueue {
  client: SubstrateClient;
  isReady: boolean = false;
  startHeader: any;
  blockQueue: EventQueue<any>;
  eventQueue: EventQueue<[string, any]>;

  constructor(_client: SubstrateClient) {
    this.client = _client;
    this.blockQueue = new EventQueue(this._handleBlock.bind(this));
    this.eventQueue = new EventQueue(this._handleEvent.bind(this));
  }

  private async _handleEvent(info: [string, any]) {
    console.log("Got event: " + info[0]);
    const method = info[0];
    const data = info[1];

    switch (method) {
      case "Deposit": {
        const id = dataToBN(data[0]);
        const account = data[1].toString();
        const token = dataToBN(data[2]);
        const amount = dataToBN(data[3]);
        const nonce = dataToBN(data[4]);
        const restAmount = dataToBN(data[5]);
        await handleDepositReq(
          id.toString(),
          account,
          token,
          amount,
          nonce,
          restAmount
        );
        break;
      }
      case "WithdrawReq": {
        const id = dataToBN(data[0]);
        const account = data[1].toString();
        const l1account = dataToBN(data[2]);
        const token = dataToBN(data[3]);
        const amount = dataToBN(data[4]);
        const nonce = dataToBN(data[5]);
        const restAmount = dataToBN(data[6]);
        await handleWithdrawReq(
          id.toString(),
          account,
          l1account,
          token,
          amount,
          nonce,
          restAmount
        );
        break;
      }
      case "SwapReq": {
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
          this.client,
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
        break;
      }
      case "PoolSupplyReq": {
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
        break;
      }
      case "PoolRetrieveReq": {
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
        break;
      }
      default:
        break;
    }
  }

  private async _handleBlock(header: any) {
    if (header.number <= this.startHeader.number) {
      return;
    }

    const events = await this.client.getEvents(header);
    events
      .filter((e: any) => e.event.section === SECTION_NAME)
      .forEach((e: any) => {
        this.eventQueue.push([e.event.method, e.event.data]);
      });
  }

  public async handleBlock(header: any) {
    this.blockQueue.push(header, this.isReady);
  }

  public async setStartHeader(header: any) {
    this.startHeader = header;
    this.isReady = true;
    this.blockQueue.push(undefined, this.isReady);
  }
}

async function main() {
  const client = new SubstrateClient(
    `${substrateNode.host}:${substrateNode.port}`,
    15
  );
  const queue = new TransactionQueue(client);

  console.log("start");
  //bridge1 = await abi.getBridge(ETHConfig['localtestnet1'], false);
  //bridge2 = await abi.getBridge(ETHConfig['localtestnet2'], false);

  bridge1 = await abi.getBridge(ETHConfig['ropsten'], false);
  bridge2 = await abi.getBridge(ETHConfig['bsctestnet'], false);
  console.log("getBridge");

  await client.init();
  await client.subscribe((header) => queue.handleBlock(header));

  const txMap = await client.getPendingReqMap();
  const txList = Array.from(txMap.entries())
    .map((kv: any) => [new BN(kv[0].replace("0x", "")), kv[1]])
    .sort((kv1: any, kv2: any) => kv1[0] - kv2[0]);

  console.log(txList.length);

  for (const kv of txList) {
    console.log(kv[1].value.toString());
    const rid = kv[0].toString();
    console.log(`rid is ${rid}`);

    if (kv[1].value.isSwap) {
      const asSwap = kv[1].value.asSwap;
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

      await handleSwapReq(
        client,
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

    if (kv[1].value.isPoolSupply) {
      const asPoolSupply = kv[1].value.asPoolSupply;
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

    if (kv[1].value.isPoolRetrieve) {
      const asPoolRetrieve = kv[1].value.asPoolRetrieve;
      let cursor = 0;
      const account = asPoolRetrieve[cursor++].toString();
      const from = new BN(asPoolRetrieve[cursor++].toString());
      const to = new BN(asPoolRetrieve[cursor++].toString());
      const amount_from = new BN(asPoolRetrieve[cursor++].toString());
      const amount_to = new BN(asPoolRetrieve[cursor++].toString());
      const nonce = new BN(asPoolRetrieve[cursor++].toString());
      const pool_amount_from = new BN(asPoolRetrieve[cursor++].toString());
      const pool_amount_to = new BN(asPoolRetrieve[cursor++].toString());
      const account_amount_from = new BN(asPoolRetrieve[cursor++].toString());
      const account_amount_to = new BN(asPoolRetrieve[cursor++].toString());
      const share = new BN(asPoolRetrieve[cursor++].toString());

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

    if (kv[1].value.isWithdraw) {
      const asDeposit = kv[1].value.asWithdraw;
      const account = asDeposit[0].toString();
      const l1account = new BN(asDeposit[1].toString());
      const token = new BN(asDeposit[2].toString());
      const amount = new BN(asDeposit[3].toString());
      const nonce = new BN(asDeposit[4].toString());
      const amountRest = new BN(asDeposit[5].toString());
      await handleWithdrawReq(
        rid,
        account,
        l1account,
        token,
        amount,
        nonce,
        amountRest
      );
    }

    if (kv[1].value.isDeposit) {
      const asDeposit = kv[1].value.asDeposit;
      const account = asDeposit[0].toString();
      const token = new BN(asDeposit[1].toString());
      const amount = new BN(asDeposit[2].toString());
      const nonce = new BN(asDeposit[3].toString());
      const amountRest = new BN(asDeposit[4].toString());
      await handleDepositReq(
        rid,
        account,
        token,
        amount,
        nonce,
        amountRest
      );
    }
  }

  queue.setStartHeader(client.lastHeader);
}

main();
