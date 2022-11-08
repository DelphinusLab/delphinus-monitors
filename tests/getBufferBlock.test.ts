import { getBufferBlocks } from "../src/tools/getBufferBlocks";

describe("test getBufferBlocks works", () => {
    test("getBufferBlocks works case 1", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let bufferBlocks = await getBufferBlocks("goerli");
        expect(bufferBlocks).toEqual(20);
    });
    test("getBufferBlocks works case 2", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let bufferBlocks = await getBufferBlocks("rolluxtestnet");
        expect(bufferBlocks).toEqual(20);
    });
})