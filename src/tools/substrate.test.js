"use strict";
// Used to init substarte env by
// 1. Create init token and pool
// 2. TBD
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../substrate/client");
const Token_json_1 = __importDefault(require("solidity/build/contracts/Token.json"));
const bn_js_1 = __importDefault(require("bn.js"));
const tokenInfo = Token_json_1.default;
function encodeGlobalTokenAddress(chainId, address) {
    const _cid = new bn_js_1.default(chainId, 10);
    const _address = new bn_js_1.default(address.replace(/0x/, ""), 16);
    console.log(_cid.shln(160).add(_address));
    return _cid.shln(160).add(_address);
}
const account = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const l1Address = 1;
async function main() {
    await (0, client_1.withL2Client)(3, async (client) => {
        let nonce = 0;
        let token = [];
        for (const network of Object.entries(tokenInfo.networks).slice(0, 2)) {
            console.log((await client.getAPI()).tx.swapModule);
            const t = encodeGlobalTokenAddress(network[0], network[1].address);
            token.push(t);
            await client.send("addToken", t);
        }
        const token0 = token[0];
        const token1 = token[1];
        await client.send("addPool", 4, 5, nonce++);
        await client.send("deposit", account, token0, 10, nonce++, 123);
        await client.send("deposit", account, token1, 10, nonce++, 1234);
        nonce = 0;
        await client.send("poolSupply", account, token0, token1, 5, 5, nonce++);
        await client.send("swap", account, token0, token1, 5, nonce++);
        await client.send("poolRetrieve", account, token0, token1, 10, 0, nonce++);
        await client.send("withdraw", account, l1Address, token0, 10, nonce++);
        await client.send("withdraw", account, l1Address, token1, 10, nonce++);
    });
}
main();
//# sourceMappingURL=substrate.test.js.map