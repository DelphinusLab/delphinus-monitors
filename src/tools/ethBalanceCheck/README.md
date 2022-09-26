You can check ETH balance on deployment account for different test network
You also can change warning amount if needed. The default setting for this tool is "1 ETH".

## HOW TO USE THIS TOOL
```
npx tsc

node eth-balance-check-tool.js ${ChainName} ${warningAmount (optional: default setting is in `deployment/config/eth-config.ts`)}

(example1: node eth-balance-check-tool.js ropsten)
(example2: node eth-balance-check-tool.js bsctestnet 0.5)
```