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
const token_index_json_1 = __importDefault(require("solidity/clients/token-index.json"));
const bn_js_1 = __importDefault(require("bn.js"));
const tokenInfo = token_index_json_1.default;
function encodeGlobalTokenAddress(chainId, address) {
    const _cid = new bn_js_1.default(chainId, 10);
    const _address = new bn_js_1.default(address.replace(/0x/, ""), 16);
    console.log(_cid.shln(160).add(_address));
    return _cid.shln(160).add(_address);
}
async function main() {
    const client = new client_1.SubstrateClient(`${substrate_node_json_1.default["host"]}:${substrate_node_json_1.default.port}`, 3);
    let nonce = 0;
    for (const network of Object.entries(tokenInfo)) {
        console.log((await client.getAPI()).tx.swapModule);
        await client.send("addToken", new bn_js_1.default(network[0], 10));
    }
    for (let i = 0; i < Object.entries(tokenInfo).length; i++) {
        for (let j = i + 1; j < Object.entries(tokenInfo).length; j++) {
            await client.send("addPool", Object.entries(tokenInfo)[i][1], Object.entries(tokenInfo)[j][1], nonce++);
        }
    }
    await client.close();
}
main();
//# sourceMappingURL=init-substrate.js.map