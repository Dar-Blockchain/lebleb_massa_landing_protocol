import { u256 } from 'as-bignum/assembly/integer/u256';
import { FeesDistribution } from './FeesDistribution';

// GENERAL

/**
 * @param {u256} amountX The amount of token X
 * @param {u256} amountY The amount of token Y
 */
export class Amounts {
  constructor(
    public amountX: u256,
    public amountY: u256,
  ) {}
}

// ROUTER

/**
 * @param {u256[]} liquidityMinted Amounts of LBToken minted for each bin
 * @param {u64[]} depositIds Bin ids where the liquidity was actually deposited
 */
export class AddLiquidity {
  constructor(
    public liquidityMinted: u256[],
    public depositIds: u64[],
  ) {}
}

// PAIR

/**
 * @param {u256} feesX The FeesDistribution of token X
 * @param {u256} feesY The FeesDistribution of token Y
 */
export class GetGlobalFeesReturn {
  constructor(
    public feesX: FeesDistribution,
    public feesY: FeesDistribution,
  ) {}
}

/**
 * @param {u256} amountXAdded The amount of token X added to the pair
 * @param {u256} amountYAdded The amount of token Y added to the pair
 * @param {u256[]} liquidityMinted The amounts of LB tokens minted for each bin
 */
export class MintReturn {
  constructor(
    public amountXAdded: u256,
    public amountYAdded: u256,
    public liquidityMinted: u256[],
  ) {}
}

/**
 * @param {u64} cumulativeId  The weighted average cumulative id
 * @param {u64} cumulativeVolatilityAccumulated The weighted average cumulative volatility accumulated
 * @param {u64} cumulativeBinCrossed The weighted average cumulative bin crossed
 */
export class OracleSampleReturn {
  constructor(
    public cumulativeId: u64,
    public cumulativeVolatilityAccumulated: u64,
    public cumulativeBinCrossed: u64,
  ) {}
}

// SWAP HELPER

/**
 * @param {u256} amountIn The amount of token to send in order to receive _amountOut token
 * @param {u256} feesIn The amount of fees paid in token sent
 */
export class GetSwapInReturn {
  constructor(
    public amountIn: u256 = u256.Zero,
    public feesIn: u256 = u256.Zero,
  ) {}
}

/**
 * @param {u256} amountOut The amount of token received if _amountIn tokenX are sent
 * @param {u256} feesIn The amount of fees paid in token sent
 */
export class GetSwapOutReturn {
  constructor(
    public amountOut: u256 = u256.Zero,
    public feesIn: u256 = u256.Zero,
  ) {}
}

/**
 * @param {u256} amountInToBin The amount of token that is added to the bin without the fees
 * @param {u256} amountOutOfBin The amount of token that is removed from the bin
 * @param {FeesDistribution} fees The swap fees
 */
export class GetAmountsReturn {
  constructor(
    public amountInToBin: u256,
    public amountOutOfBin: u256,
    public fees: FeesDistribution,
  ) {}
}

// MATH 512 BITS

/**
 * @param {u256} prod0 The least significant 256 bits of the product
 * @param {u256} prod1 TThe most significant 256 bits of the product
 */
export class GetMulProds {
  constructor(
    public prod0: u256,
    public prod1: u256,
  ) {}
}

// TREE HELPER

/**
 * @param {u32} branchId The branch id from above
 * @param {u32} leafId The leaf id from above
 */
export class GetIdsFromAboveReturn {
  constructor(
    public branchId: u32,
    public leafId: u32,
  ) {}
}

// ORACLE

/**
 * @param {u64} timestamp The timestamp of the sample
 * @param {u256} cumulativeId The weighted average cumulative id
 * @param {u256} cumulativeVolatilityAccumulated The weighted average cumulative volatility accumulated
 * @param {u256} cumulativeBinCrossed The weighted average cumulative bin crossed
 */
export class GetSampleAtReturn {
  constructor(
    public timestamp: u64,
    public cumulativeId: u256,
    public cumulativeVolatilityAccumulated: u256,
    public cumulativeBinCrossed: u256,
  ) {}
}