import { ChainConfig } from "delphinus-deployment/src/types";

export async function getBufferBlocks(config: ChainConfig) {
    let bufferBlocks = 20;
    if(config.bufferBlocks != undefined && !isNaN(Number(config.bufferBlocks))){
        if(config.bufferBlocks >= 0){
            bufferBlocks = config.bufferBlocks;
        }
    }
    return bufferBlocks
}