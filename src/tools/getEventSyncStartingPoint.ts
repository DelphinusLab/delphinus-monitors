import fs from "fs-extra";

export async function getEventSyncStartingPointByChainID(ChainID: string){
    let eventSyncStartingPoint = 0;
    if (fs.existsSync(__dirname + '/../../../../blockNumberBeforeDeployment.json')) {
      const bnInfo = require('../../../../blockNumberBeforeDeployment.json');
      eventSyncStartingPoint = bnInfo[ChainID];
    }else{
      console.log("Can't find `blockNumberBeforeDeployment.json` in lerna");
      console.log("Sync From LastCheckedBlockNumber");
    }
    return eventSyncStartingPoint
}