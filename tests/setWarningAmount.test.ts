import { getGasWarningAmount } from "../src/tools/ethBalanceCheck/eth-balance-check";

describe("test getGasWarningAmount function works", () => {
    test("test when setWarningAmount is in the input", async () => {
        jest.setTimeout(60000); //1 minute timeout
        const warningAmount = await getGasWarningAmount("goerli","2")
        expect(warningAmount).toEqual('2');
    });

    test("test when setWarningAmount is in the input", async () => {
        jest.setTimeout(60000); //1 minute timeout
        const warningAmount = await getGasWarningAmount("goerli")
        expect(warningAmount).toEqual('1');
    });
});