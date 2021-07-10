import BN from "bn.js"

export function sortPoolPair(
    from: BN,
    to: BN,
    pool_amount_from: BN,
    pool_amount_to: BN,
    account_amount_from: BN,
    account_amount_to: BN
  ) {
    if (from < to) {
      return {
        token0: from,
        token1: to,
        amount0: pool_amount_from,
        amount1: pool_amount_to,
        balance0: account_amount_from,
        balance1: account_amount_to
      }
    }
  
    return {
      token1: from,
      token0: to,
      amount1: pool_amount_from,
      amount0: pool_amount_to,
      balance1: account_amount_from,
      balance0: account_amount_to
    }
  }