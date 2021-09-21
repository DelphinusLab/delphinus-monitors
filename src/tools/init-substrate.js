"use strict";
// Used to init substarte env by
// 1. Create init token and pool
// 2. TBD
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../substrate/client");
const substrate_node_json_1 = __importDefault(require("../../config/substrate-node.json"));
const Token_json_1 = __importDefault(require("solidity/build/contracts/Token.json"));
const bn_js_1 = __importDefault(require("bn.js"));
const tokenInfo = Token_json_1.default;
function encodeGlobalTokenAddress(chainId, address) {
    const _cid = new bn_js_1.default(chainId, 10);
    const _address = new bn_js_1.default(address.replace(/0x/, ""), 16);
    console.log(_cid.shln(160).add(_address));
    return _cid.shln(160).add(_address);
}
async function main() {
    const client = new client_1.SubstrateClient(`${substrate_node_json_1.default["host-local"]}:${substrate_node_json_1.default.port}`, 3);
    let nonce = 0;
    for (const network of Object.entries(tokenInfo.networks).slice(0, 2)) {
        console.log((await client.getAPI()).tx.swapModule);
        await client.send("addToken", encodeGlobalTokenAddress(network[0], network[1].address));
    }
    await client.send("addPool", 4, 5, nonce++);
    await client.close();
}
main();
//# sourceMappingURL=init-substrate.js.map