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

async function try_verify(bridge:any, l2acc:string, buffer:BN[], b:BN, rid:BN) {
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

async function handleDepositReq(
  client: SubstrateClient,
  rid: string,
  account?: string,
  token?: BN,
  amount?: BN,
  nonce?: BN,
  amountRest?: BN
) {
  let l2account = l2address.ss58_to_bn(account);
  let buffer = [new BN(1).shln(31 * 8), l2account, token, amountRest, amount];
  console.log(`Trigger handleDepositReq, request id ${rid}.`);
  console.log(`Start verify`);
  console.log("---------------");
  buffer.forEach((v) => console.log(v.bitLength()));
  console.log("---------------");
  console.log("++++++++++++++");
  buffer.forEach((v) => console.log("0x" + v.toString(16, 32)));
  console.log("++++++++++++++");

  await try_verify(bridge1, l2account, buffer, new BN("0"), new BN(rid));
  await try_verify(bridge2, l2account, buffer, new BN("0"), new BN(rid));
  console.log(`Finish verify`);
}

async function handleWithdrawReq(
  client: SubstrateClient,
  rid: string,
  account: string,
  l1account: BN,
  token?: BN,
  amount?: BN,
  nonce?: BN,
  amountRest?: BN
) {
  let l2account = l2address.ss58_to_bn(account);
  let buffer = [new BN(0), l2account, token, amountRest, l1account, amount];
  console.log(`Trigger handleWithdrawReq, request id ${rid}.`);
  console.log(`Start verify`);
  console.log("---------------");
  buffer.forEach((v) => console.log(v.bitLength()));
  console.log("---------------");
  console.log("++++++++++++++");
  buffer.forEach((v) => console.log("0x" + v.toString(16, 32)));
  console.log("++++++++++++++");

  let cont = false;
  do {
    cont = false;
    try {
      console.log("start to send to ropsten");
      await bridge1.bridge.methods
        .verify(l2account, buffer, new BN("0"), new BN(rid))
        .send();
    } catch (e) {
      if (e.message != "nonce too low") {
        console.log("failed on ropsten");
        cont = true;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } while (cont)

  console.log('tx1 done');

  do {
    cont = false;
    try {
      console.log("start to send to bsc");
      await bridge2.bridge.methods
        .verify(l2account, buffer, new BN("0"), new BN(rid))
        .send();
    } catch (e) {
      if (e.message != "nonce too low") {
        console.log("failed on bsc");
        cont = true;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } while (cont)

  console.log(`Finish verify`);
}

async function handleSwapReq(
  client: SubstrateClient,
  rid: string,
  account?: string,
  from?: BN,
  to?: BN,
  from_amount?: BN,
  to_amount?: BN,
  nonce?: BN
) {
  let l2account = l2address.ss58_to_bn(account);
  let tx = await bridge1.bridge.methods.verify(l2account, [], "0", rid).send();
  console.log(`Trigger handleSwapReq, request id ${rid}.`);
}

async function handlePoolSupplyReq(
  client: SubstrateClient,
  rid: string,
  account?: string,
  from?: BN,
  to?: BN,
  from_amount?: BN,
  to_amount?: BN,
  nonce?: BN
) {
  let l2account = l2address.ss58_to_bn(account);
  let tx = await bridge1.bridge.methods.verify(l2account, [], "0", rid).send();
  console.log(`Trigger handlePoolSupplyReq, request id ${rid}.`);
}

async function handlePoolRetrieveReq(
  client: SubstrateClient,
  rid: string,
  account?: string,
  from?: BN,
  to?: BN,
  from_amount?: BN,
  to_amount?: BN,
  nonce?: BN
) {
  let l2account = l2address.ss58_to_bn(account);
  let tx = await bridge1.bridge.methods.verify(l2account, [], "0", rid).send();
  console.log(`Trigger handlePoolRetrieveReq, request id ${rid}.`);
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
          this.client,
          id.toString(),
          account,
          token,
          amount,
          nonce,
          restAmount
        );
        break;
      }
      case "SwapReq": {
        const id = dataToBN(data[0]);
        const account = data[1].toString();
        const from = dataToBN(data[2]);
        const to = dataToBN(data[3]);
        const from_amount = dataToBN(data[4]);
        const to_amount = dataToBN(data[5]);
        await handleSwapReq(
          this.client,
          id.toString(),
          account,
          from,
          to,
          from_amount,
          to_amount
        );
        break;
      }
      case "PoolSupplyReq": {
        const id = dataToBN(data[0]);
        const account = data[1].toString();
        const from = dataToBN(data[2]);
        const to = dataToBN(data[3]);
        const from_amount = dataToBN(data[4]);
        const to_amount = dataToBN(data[5]);
        await handlePoolSupplyReq(
          this.client,
          id.toString(),
          account,
          from,
          to,
          from_amount,
          to_amount
        );
        break;
      }
      case "PoolRetrieveReq": {
        const id = dataToBN(data[0]);
        const account = data[1].toString();
        const from = dataToBN(data[2]);
        const to = dataToBN(data[3]);
        const from_amount = dataToBN(data[4]);
        const to_amount = dataToBN(data[5]);
        await handlePoolRetrieveReq(
          this.client,
          id.toString(),
          account,
          from,
          to,
          from_amount,
          to_amount
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
          this.client,
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
      const account = asSwap[0].toString();
      const from = new BN(asSwap[1].toString());
      const to = new BN(asSwap[2].toString());
      const amount_from = new BN(asSwap[3].toString());
      const amount_to = new BN(asSwap[4].toString());
      const nonce = new BN(asSwap[5].toString());
      await handleSwapReq(
        client,
        rid,
        account,
        from,
        to,
        amount_from,
        amount_to,
        nonce
      );
    }

    if (kv[1].value.isPoolSupply) {
      const asPoolSupply = kv[1].value.asPoolSupply;
      const account = asPoolSupply[0].toString();
      const from = new BN(asPoolSupply[1].toString());
      const to = new BN(asPoolSupply[2].toString());
      const amount_from = new BN(asPoolSupply[3].toString());
      const amount_to = new BN(asPoolSupply[4].toString());
      const nonce = new BN(asPoolSupply[5].toString());
      await handlePoolSupplyReq(
        client,
        rid,
        account,
        from,
        to,
        amount_from,
        amount_to,
        nonce
      );
    }

    if (kv[1].value.isPoolRetrieve) {
      const asPoolRetrieve = kv[1].value.asPoolRetrieve;
      const account = asPoolRetrieve[0].toString();
      const from = new BN(asPoolRetrieve[1].toString());
      const to = new BN(asPoolRetrieve[2].toString());
      const amount_from = new BN(asPoolRetrieve[3].toString());
      const amount_to = new BN(asPoolRetrieve[4].toString());
      const nonce = new BN(asPoolRetrieve[5].toString());
      await handlePoolRetrieveReq(
        client,
        rid,
        account,
        from,
        to,
        amount_from,
        amount_to,
        nonce
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
        client,
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
        client,
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
