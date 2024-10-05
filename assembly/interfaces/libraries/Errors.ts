import { Address } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { u256ToString } from './Utils';

/** LBRouter errors */

export const LBRouter__WrongAmounts = (amount: u256, reserve: u256): string =>
  `LBRouter__WrongAmounts: ${u256ToString(amount)}, ${u256ToString(reserve)}`;
export const LBRouter__SwapOverflows = (id: u64): string =>
  `LBRouter__SwapOverflows: ${id}`;
export const LBRouter__BrokenSwapSafetyCheck = (): string =>
  'LBRouter__BrokenSwapSafetyCheck';
export const LBRouter__NotFactoryOwner = (): string =>
  'LBRouter__NotFactoryOwner';
export const LBRouter__TooMuchTokensIn = (excess: u256): string =>
  `LBRouter__TooMuchTokensIn: ${u256ToString(excess)}`;
export const LBRouter__IdOverflows = (id: i64): string =>
  `LBRouter__IdOverflows: ${id}`;
export const LBRouter__LengthsMismatch = (): string =>
  'LBRouter__LengthsMismatch';
export const LBRouter__WrongTokenOrder = (): string =>
  'LBRouter__WrongTokenOrder';
export const LBRouter__IdSlippageCaught = (
  activeIdDesired: u64,
  idSlippage: u64,
  activeId: u64,
): string =>
  `LBRouter__IdSlippageCaught: ${activeIdDesired}, ${idSlippage}, ${activeId}`;
export const LBRouter__AmountSlippageCaught = (
  amountXMin: u256,
  amountX: u256,
  amountYMin: u256,
  amountY: u256,
): string =>
  `LBRouter__AmountSlippageCaught: ${u256ToString(amountXMin)}, ${u256ToString(
    amountX,
  )}, ${u256ToString(amountYMin)}, ${u256ToString(amountY)}`;
export const LBRouter__IdDesiredOverflows = (
  idDesired: u64,
  idSlippage: u64,
): string => `LBRouter__IdDesiredOverflows: ${idDesired}, ${idSlippage}`;
export const LBRouter__DeadlineExceeded = (
  deadline: u64,
  currentTimestamp: u64,
): string => `LBRouter__DeadlineExceeded: ${deadline}, ${currentTimestamp}`;
export const LBRouter__InsufficientAmountOut = (
  amountOutMin: u256,
  amountOut: u256,
): string =>
  `LBRouter__InsufficientAmountOut: ${u256ToString(
    amountOutMin,
  )}, ${u256ToString(amountOut)}`;
export const LBRouter__MaxAmountInExceeded = (
  amountInMax: u256,
  amountIn: u256,
): string =>
  `LBRouter__MaxAmountInExceeded: ${u256ToString(amountInMax)}, ${u256ToString(
    amountIn,
  )}`;
export const LBRouter__InvalidTokenPath = (wrongToken: Address): string =>
  `LBRouter__InvalidTokenPath: ${wrongToken}`;
export const LBRouter__WrongMasLiquidityParameters = (
  tokenX: Address,
  tokenY: Address,
  amountX: u256,
  amountY: u256,
  msgValue: u64,
): string =>
  `LBRouter__WrongMasLiquidityParameters: ${tokenX}, ${tokenY}, ${u256ToString(
    amountX,
  )}, ${u256ToString(amountY)}, ${msgValue}`;

/** LBToken errors */

export const LBToken__SpenderNotApproved = (
  owner: Address,
  spender: Address,
): string => `LBToken__SpenderNotApproved: ${owner}, ${spender}`;
export const LBToken__BurnExceedsBalance = (
  from: Address,
  id: u64,
  amount: u256,
): string =>
  `LBToken__BurnExceedsBalance: ${from}, ${id}, ${u256ToString(amount)}`;
export const LBToken__LengthMismatch = (
  accountsLength: u64,
  idsLength: u64,
): string => `LBToken__LengthMismatch: ${accountsLength}, ${idsLength}`;
export const LBToken__SelfApproval = (owner: Address): string =>
  `LBToken__SelfApproval: ${owner}`;
export const LBToken__TransferExceedsBalance = (
  from: Address,
  id: u64,
  amount: u256,
): string =>
  `LBToken__TransferExceedsBalance: ${from}, ${id}, ${u256ToString(amount)}`;
export const LBToken__TransferToSelf = (): string => 'LBToken__TransferToSelf';

/** LBFactory errors */

export const LBFactory__IdenticalAddresses = (token: Address): string =>
  `LBFactory__IdenticalAddresses: ${token}`;
export const LBFactory__QuoteAssetNotWhitelisted = (
  quoteAsset: Address,
): string => `LBFactory__QuoteAssetNotWhitelisted: ${quoteAsset}`;
export const LBFactory__QuoteAssetAlreadyWhitelisted = (
  quoteAsset: Address,
): string => `LBFactory__QuoteAssetAlreadyWhitelisted: ${quoteAsset}`;
export const LBFactory__LBPairAlreadyExists = (
  tokenX: Address,
  tokenY: Address,
  _binStep: u64,
): string =>
  `LBFactory__LBPairAlreadyExists: ${tokenX}, ${tokenY}, ${_binStep}`;
export const LBFactory__DecreasingPeriods = (
  filterPeriod: u32,
  decayPeriod: u32,
): string => `LBFactory__DecreasingPeriods: ${filterPeriod}, ${decayPeriod}`;
export const LBFactory__ReductionFactorOverflows = (
  reductionFactor: u32,
  max: u64,
): string => `LBFactory__ReductionFactorOverflows: ${reductionFactor}, ${max}`;
export const LBFactory__FeesAboveMax = (
  baseFee: u64,
  _maxVariableFee: u64,
  maxFees: u64,
): string =>
  `LBFactory__FeesAboveMax: ${baseFee}, ${_maxVariableFee}, ${maxFees}`;
export const LBFactory__FlashLoanFeeAboveMax = (
  fees: u64,
  maxFees: u64,
): string => `LBFactory__FlashLoanFeeAboveMax: ${fees}, ${maxFees}`;
export const LBFactory__BinStepRequirementsBreached = (
  lowerBound: u64,
  binStep: u32,
  higherBound: u64,
): string =>
  `LBFactory__BinStepRequirementsBreached: ${lowerBound}, ${binStep}, ${higherBound}`;
export const LBFactory__ProtocolShareOverflows = (
  protocolShare: u32,
  max: u64,
): string => `LBFactory__ProtocolShareOverflows: ${protocolShare}, ${max}`;
export const LBFactory__FunctionIsLockedForUsers = (user: Address): string =>
  `LBFactory__FunctionIsLockedForUsers: ${user}`;
export const LBFactory__FactoryLockIsAlreadyInTheSameState = (): string =>
  'LBFactory__FactoryLockIsAlreadyInTheSameState';
export const LBFactory__LBPairIgnoredIsAlreadyInTheSameState = (): string =>
  'LBFactory__LBPairIgnoredIsAlreadyInTheSameState';
export const LBFactory__BinStepHasNoPreset = (binStep: u64): string =>
  `LBFactory__BinStepHasNoPreset: ${binStep}`;
export const LBFactory__SameFeeRecipient = (feeRecipient: Address): string =>
  `LBFactory__SameFeeRecipient: ${feeRecipient}`;
export const LBFactory__SameFlashLoanFee = (flashLoanFee: u64): string =>
  `LBFactory__SameFlashLoanFee: ${flashLoanFee}`;

/** LBPair errors */

export const LBPair__InsufficientAmounts = (): string =>
  'LBPair__InsufficientAmounts';
export const LBPair__AddressZero = (): string => 'LBPair__AddressZero';
export const LBPair__AddressZeroOrThis = (): string =>
  'LBPair__AddressZeroOrThis';
export const LBPair__CompositionFactorFlawed = (id: u64): string =>
  `LBPair__CompositionFactorFlawed: ${id}`;
export const LBPair__InsufficientLiquidityMinted = (id: u64): string =>
  `LBPair__InsufficientLiquidityMinted: ${id}`;
export const LBPair__InsufficientLiquidityBurned = (id: u64): string =>
  `LBPair__InsufficientLiquidityBurned: ${id}`;
export const LBPair__WrongLengths = (): string => 'LBPair__WrongLengths';
export const LBPair__OnlyStrictlyIncreasingId = (): string =>
  'LBPair__OnlyStrictlyIncreasingId';
export const LBPair__OnlyFactory = (): string => 'LBPair__OnlyFactory';
export const LBPair__DistributionsOverflow = (): string =>
  'LBPair__DistributionsOverflow';
export const LBPair__OnlyFeeRecipient = (
  feeRecipient: Address,
  sender: Address,
): string => `LBPair__OnlyFeeRecipient: ${feeRecipient}, ${sender}`;
export const LBPair__OracleNewSizeTooSmall = (
  newSize: u64,
  oracleSize: u64,
): string => `LBPair__OracleNewSizeTooSmall: ${newSize}, ${oracleSize}`;
export const LBPair__FlashLoanCallbackFailed = (): string =>
  'LBPair__FlashLoanCallbackFailed';
export const LBPair__FlashLoanInvalidBalance = (): string =>
  'LBPair__FlashLoanInvalidBalance';
export const LBPair__FlashLoanInvalidToken = (): string =>
  'LBPair__FlashLoanInvalidToken';
export const LBPair__BinStepNotSame = (): string => 'LBPair__BinStepNotSame';

/** BinHelper errors */

export const BinHelper__BinStepOverflows = (bp: u64): string =>
  `BinHelper__BinStepOverflows: ${bp}`;
export const BinHelper__IdOverflows = (): string => 'BinHelper__IdOverflows';

/** Math128x128 errors */

export const Math128x128__PowerUnderflow = (x: u256, y: i64): string =>
  `Math128x128__PowerUnderflow: ${u256ToString(x)}, ${y}`;

/** Math512Bits errors */

export const Math512Bits__MulDivOverflow = (
  prod1: u256,
  denominator: u256,
): string =>
  `Math512Bits__MulDivOverflow: ${u256ToString(prod1)}, ${u256ToString(
    denominator,
  )}`;
export const Math512Bits__MulShiftOverflow = (
  prod1: u256,
  offset: u64,
): string => `Math512Bits__MulShiftOverflow: ${u256ToString(prod1)}, ${offset}`;
export const Math512Bits__OffsetOverflows = (offset: u64): string =>
  `Math512Bits__OffsetOverflows: ${offset}`;

/** Oracle errors */

export const Oracle__LookUpTimestampTooOld = (
  _minTimestamp: u64,
  _lookUpTimestamp: u64,
): string =>
  `Oracle__LookUpTimestampTooOld: ${_minTimestamp}, ${_lookUpTimestamp}`;
export const Oracle__NotInitialized = (): string => 'Oracle__NotInitialized';

/** ReentrancyGuardUpgradeable errors */

export const ReentrancyGuardUpgradeable__ReentrantCall = (): string =>
  'ReentrancyGuardUpgradeable__ReentrantCall';
export const ReentrancyGuardUpgradeable__AlreadyInitialized = (): string =>
  'ReentrancyGuardUpgradeable__AlreadyInitialized';

/** TreeMath errors */

export const TreeMath__ErrorDepthSearch = (): string =>
  'TreeMath__ErrorDepthSearch';

/** LBQuoter errors */

export const LBQuoter_InvalidLength = (): string => 'LBQuoter_InvalidLength';

/** Storage errors */

export const Storage__NotEnoughCoinsSent = (spent: u64, sent: u64): string =>
  `Storage__NotEnoughCoinsSent: ${spent}, ${sent}`;
