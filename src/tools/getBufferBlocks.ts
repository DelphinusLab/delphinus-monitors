import { getConfigByChainName } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";

export async function getBufferBlocks(chainName:string) {
    const config = await getConfigByChainName(L1ClientRole.Monitor, chainName);
    let bufferBlocks = 20;
    if(config.bufferBlocks && !isNaN(Number(config.bufferBlocks))){
        bufferBlocks = config.bufferBlocks;
    }
    return bufferBlocks
}