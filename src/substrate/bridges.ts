interface BridgeInfo {
    name: string;
    bridge: any;
}

export const bridgeInfos: BridgeInfo[] = [];

export function registerBridge(name: string, bridge: any) {
    bridgeInfos.push({
        name,
        bridge,
    })
}
