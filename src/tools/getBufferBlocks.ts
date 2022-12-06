export async function getBufferBlocks(buffer?:number) {
    let bufferBlocks = 20;
    if(buffer != null && !isNaN(Number(buffer))){
        if(buffer >= 0){
            bufferBlocks = buffer;
        }
    }
    return bufferBlocks
}