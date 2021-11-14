import { Keyring } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { SubstrateClient, withL2Client } from "./client";

async function main() {
  console.log("start");
  await withL2Client(15, async (client: SubstrateClient) => {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: "sr25519" });
    const account = keyring.addFromUri("//Bob", {
      name: "Bob default",
    }).address;

    const api = await client.getAPI();
    const sudo = await client.getSudo();

    /*
  const txs = [
    api.tx.templateModule.deposit(account, 100),
    api.tx.templateModule.withdrawReq(account, 10),
    api.tx.templateModule.withdrawReq(account, 20)
  ];
*/

    /*
  await api.tx.templateModule.deposit(account, 100).signAndSend(sudo, async ({ status }) => {
    if (status.isInBlock) {
      console.log(`1 included in ${status.asInBlock}`);
    }
  });
*/
    console.log(account);
    await client.send("deposit", account, 0, 100, 0);
    await client.send("deposit", account, 1, 50, 1);
    await client.send("poolSupply", account, 0, 1, 10, 10, 0);
    await client.send("swap", account, 0, 1, 1, 1);
    /*
  await client.send('ack', 1);
  await client.send('ack', 2);
  await client.send('ack', 3);
  await client.send('deposit', account, 0, 100, 3);
  await client.send('deposit', account, 1, 50, 4);
  */

    /*
  api.tx.utility
  .batch(txs)
  .signAndSend(sudo, ({ status }) => {
    if (status.isInBlock) {
      console.log(`included in ${status.asInBlock}`);
    }
  });
  */
  });
}

main();
