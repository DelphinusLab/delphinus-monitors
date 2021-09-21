// Used to init substarte env by
// 1. Create init token and pool
// 2. TBD

import { SubstrateClient } from "../substrate/client";

import substrateNode from "../../config/substrate-node.json";
import L1TokenInfo from "solidity/build/contracts/Token.json";
import RioTokenInfo from "solidity/build/contracts/Rio.json";
import BN from "bn.js";

const tokenInfo = L1TokenInfo;

function encodeGlobalTokenAddress(chainId: string, address: string) {
    const _cid = new BN(chainId, 10);
    const _address = new BN(address.replace(/0x/, ""), 16);
    console.log( _cid.shln(160).add(_address));
    return _cid.shln(160).add(_address);
}

async function main() {
    const client = new SubstrateClient(
        `${substrateNode["host-local"]}:${substrateNode.port}`, 3
    );

    let nonce = 0;

    for (const network of Object.entries(tokenInfo.networks).slice(0, 2)) {
        console.log((await client.getAPI()).tx.swapModule);
        await client.send("addToken", encodeGlobalTokenAddress(network[0], network[1].address));
    }

    await client.send("addPool", 4, 5, nonce++);

    await client.close();
}

main();