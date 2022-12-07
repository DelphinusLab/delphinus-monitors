export async function getBufferBlocks(buffer?:number) {
    let bufferBlocks: number;
    const defaltBufferBlocks = 0;
    if(buffer != null && !isNaN(Number(buffer))){
        if(buffer >= 0){
            bufferBlocks = buffer;
        }else{
            bufferBlocks = defaltBufferBlocks;
        }
    }else {
        bufferBlocks = defaltBufferBlocks;
    }
    return bufferBlocks
}