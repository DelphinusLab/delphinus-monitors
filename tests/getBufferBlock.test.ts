import { getBufferBlocks } from "../src/tools/getBufferBlocks";

describe("test getBufferBlocks works", () => {
    test("getBufferBlocks works case 1 with bufferBlocks", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let buffer = 20;
        let bufferBlocks = await getBufferBlocks(buffer);
        expect(bufferBlocks).toEqual(20);
    });

    test("getBufferBlocks works case 2 without bufferBlocks", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let buffer: undefined;
        let bufferBlocks = await getBufferBlocks(buffer);
        expect(bufferBlocks).toEqual(0);
    });

    test("getBufferBlocks works case 3 with negative bufferBlocks", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let buffer = -2;
        let bufferBlocks = await getBufferBlocks(buffer);
        expect(bufferBlocks).toEqual(0);
    });

    test("getBufferBlocks works case 4 with 0 bufferBlocks", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let buffer = 0;
        let bufferBlocks = await getBufferBlocks(buffer);
        expect(bufferBlocks).toEqual(0);
    });
})