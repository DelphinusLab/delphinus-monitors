export interface Block {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
}

export interface BaseExtrinsic extends Block {
  // All this data is obtainable for failed and successful extrinsics
  extrinsicIndex: number;
  extrinsicHash: string;
  module: string;
  method: string;
  args: any; //TODO: type this
  fee: string;
  signer: string;
}

export interface ExtrinsicSuccess extends BaseExtrinsic {
  //TODO: turn into custom transaction data such as ReqID etc...
  data: any[]; // event data from extrinsic
}

export interface ExtrinsicFail extends BaseExtrinsic {
  error: string; //Error message from the node
}

//https://github.com/DelphinusLab/zkc-substrate-node/blob/main/pallets/swap/src/lib.rs
// The args and event data is from the pallets/swap/src/lib.rs

//TODO: Currently all data coming in from substrate is parsed to strings in /substrate/client.ts
//If we want to store the data in mongodb as numbers, we need to parse it back to the correct type.
export interface BaseEvent {
  //This data is emitted for all successful extrinsics
  reqId: number;
  sig1: string; // user signature
  sig2: string;
  sig3: string;
  nonce: number;
}
/* SetKey args */
export interface SetKeyArgs {
  key: string;
}
export interface SetKeyEvent extends BaseEvent {
  accountIndex: number;
  reserveU32: string;
  x: string;
  y: string;
}

export interface ChargeArgs {
  l2Address: string; // User l2 address - TODO: need to find a way to use accountIndex property or handle Charge separately
  amount: string;
  l1_tx_hash: string;
}

export interface ChargeEvent {
  relayerAddress: string; //relayer l2 address
  amount: string;
  blockNumber: number;
}
/* Deposit function inputs and output data */
export interface DepositArgs {
  signature: string;
  accountIndex: number;
  tokenIndex: number;
  amount: string;
  l1_tx_hash: string;
  nonce: number;
}

export interface DepositEvent extends BaseEvent {
  accountIndex: number; //user account index
  tokenIndex: string;
  amount: string;
  reserveU256: number;
  callerAccountIndex: number; // relayer account index
}
/* Withdraw function inputs and output data */
export interface WithdrawArgs {
  signature: string;
  tokenIndex: string;
  amount: string;
  l1Account: string; // L1 address
  nonce: string;
}
//TODO: Need to record L1 transaction hash
export interface WithdrawEvent extends BaseEvent {
  accountIndex: number; //user account index
  tokenIndex: number;
  amount: string;
  l1Account: string; // L1 address withdrawn to
}
/* Swap function inputs and output data */
export interface SwapArgs {
  signature: string;
  poolIndex: number;
  reverse: number;
  amount: string;
  nonce: number;
}

export interface SwapEvent extends BaseEvent {
  accountIndex: number;
  poolIndex: number;
  reverse: number;
  amount: string;
  result_amount: string;
}

/* PoolSupply function inputs and output data */
export interface SupplyArgs {
  signature: string;
  poolIndex: number;
  amount0: string;
  amount1: string;
  nonce: number;
}

export interface SupplyEvent extends BaseEvent {
  accountIndex: number;
  poolIndex: number;
  amount0: string;
  amount1: string;
}
/* Currently retrieve is same as supply args, maybe can place into one type */
export interface RetrieveArgs {
  signature: string;
  poolIndex: number;
  amount0: string;
  amount1: string;
  nonce: number;
}

export interface RetrieveEvent extends BaseEvent {
  accountIndex: number;
  poolIndex: number;
  amount0: string;
  amount1: string;
}

/* AddPool args */
export interface AddPoolArgs {
  signature: string;
  tokenIndex0: number;
  tokenIndex1: number;
  nonce: number;
}

export interface AddPoolEvent extends BaseEvent {
  reqId: number;
  sig1: string;
  sig2: string;
  sig3: string;
  nonce: number;
  tokenIndex0: number;
  tokenIndex1: number;
  reserve_0: string;
  reserve_1: string;
  poolIndex: number;
  callerAccountIndex: number; //account which added the pool, currently admin account only
}

/* Ack args */
export interface AckArgs {
  reqIdStart: number;
}

export interface AckEvent {
  reqIdStart: number;
  ackBits: Uint8Array;
}
