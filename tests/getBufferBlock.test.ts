import { getBufferBlocks } from "../src/tools/getBufferBlocks";

describe("test getBufferBlocks works", () => {
    test("getBufferBlocks works case 1 with bufferBlocks", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let config = {
            chainName: "",
            mongodbUrl: "",
            syncEventsStep: 0,
            bufferBlocks: 20,
            gasWarningAmount: "",
            rpcSource:"",
            wsSource:"",
            privateKey: "",
            monitorAccount: "",
            deviceId: "",
            l2Account: "",
            enabled: true,
            isSnap: false,
          }
        let bufferBlocks = await getBufferBlocks(config);
        expect(bufferBlocks).toEqual(20);
    });

    test("getBufferBlocks works case 2 without bufferBlocks", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let config = {
            chainName: "",
            mongodbUrl: "",
            syncEventsStep: 0,
            gasWarningAmount: "",
            rpcSource:"",
            wsSource:"",
            privateKey: "",
            monitorAccount: "",
            deviceId: "",
            l2Account: "",
            enabled: true,
            isSnap: false,
          }
        let bufferBlocks = await getBufferBlocks(config);
        expect(bufferBlocks).toEqual(20);
    });

    test("getBufferBlocks works case 3 with negative bufferBlocks", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let config = {
            chainName: "",
            mongodbUrl: "",
            syncEventsStep: 0,
            bufferBlocks: -2,
            gasWarningAmount: "",
            rpcSource:"",
            wsSource:"",
            privateKey: "",
            monitorAccount: "",
            deviceId: "",
            l2Account: "",
            enabled: true,
            isSnap: false,
          }
        let bufferBlocks = await getBufferBlocks(config);
        expect(bufferBlocks).toEqual(20);
    });

    test("getBufferBlocks works case 4 with 0 bufferBlocks", async () => {
        jest.setTimeout(60000); //1 minute timeout
        let config = {
            chainName: "",
            mongodbUrl: "",
            syncEventsStep: 0,
            bufferBlocks: 0,
            gasWarningAmount: "",
            rpcSource:"",
            wsSource:"",
            privateKey: "",
            monitorAccount: "",
            deviceId: "",
            l2Account: "",
            enabled: true,
            isSnap: false,
          }
        let bufferBlocks = await getBufferBlocks(config);
        expect(bufferBlocks).toEqual(0);
    });
})