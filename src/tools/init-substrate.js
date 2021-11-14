"use strict";
// Used to init substarte env by
// 1. Create init token and pool
// 2. TBD
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../substrate/client");
const token_index_json_1 = __importDefault(require("solidity/clients/token-index.json"));
const tokenInfo = token_index_json_1.default;
async function main() {
    await (0, client_1.withL2Client)(3, async (l2client) => {
        let nonce = 0;
        for (let i = 0; i < Object.entries(tokenInfo).length; i++) {
            for (let j = i + 1; j < Object.entries(tokenInfo).length; j++) {
                await l2client.send("addPool", Object.entries(tokenInfo)[i][1], Object.entries(tokenInfo)[j][1], nonce++);
            }
        }
    });
}
main();
//# sourceMappingURL=init-substrate.js.map