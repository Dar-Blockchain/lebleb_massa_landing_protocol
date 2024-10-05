import {
  Address,
  call,
  isAddressEoa,
  transferCoins,
} from '@massalabs/massa-as-sdk';
import { PRECISION, SCALE_OFFSET } from './Constants';
import { BinHelper } from './BinHelper';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { SafeMath, SafeMath256 } from './SafeMath';
import { Args } from '@massalabs/as-types';
import { Storage__NotEnoughCoinsSent } from './Errors';

// used to separate elements in a string (e.g. Storage key/value)
export const DELIMITER = ':';
export function createKey(args: string[]): string {
  return args.join(DELIMITER);
}

class SortTokensReturn {
  constructor(
    readonly token0: Address,
    readonly token1: Address,
  ) {}
}

/**
 * @notice Private view function to sort 2 tokens in ascending order
 * @param _tokenA The first token
 * @param _tokenB The second token
 * @return SortTokensReturn: token0, token1
 */
export function _sortTokens(
  _tokenA: Address,
  _tokenB: Address,
): SortTokensReturn {
  if (_tokenA.toString() < _tokenB.toString()) {
    return new SortTokensReturn(_tokenA, _tokenB);
  } else {
    return new SortTokensReturn(_tokenB, _tokenA);
  }
}

class SpreadLiqudityReturn {
  constructor(
    public ids: u64[],
    public distributionX: u256[],
    public distributionY: u256[],
    public amountXIn: u256,
  ) {}
}

export function spreadLiqudity(
  amountYIn: u256,
  startId: u32,
  numbersBins: u32,
  gap: u32,
  binStep: u32,
): SpreadLiqudityReturn {
  assert(numbersBins % 2 != 0, 'numbersBins must be uneven');

  const spread = numbersBins / 2;
  const ids = new Array<u64>(numbersBins);
  const distributionX = new Array<u256>(numbersBins);
  const distributionY = new Array<u256>(numbersBins);
  const binDistribution = u256.div(PRECISION, u256.from(spread + 1));
  const binLiquidity = u256.div(amountYIn, u256.from(spread + 1));
  let amountXIn: u256 = u256.Zero;

  for (let i: u32 = 0; i < numbersBins; i++) {
    ids[i] = startId - spread * (1 + gap) + i * (1 + gap);

    if (i <= spread) {
      distributionY[i] = binDistribution;
    }
    if (i >= spread) {
      distributionX[i] = binDistribution;
      amountXIn =
        binLiquidity > u256.Zero
          ? SafeMath256.add(
              amountXIn,
              SafeMath256.add(
                u256.div(
                  SafeMath256.mul(
                    binLiquidity,
                    SafeMath256.sub(u256.shl(u256.One, SCALE_OFFSET), u256.One),
                  ),
                  BinHelper.getPriceFromId(ids[i], binStep),
                ),
                u256.One,
              ),
            )
          : u256.Zero;
    }
  }

  return new SpreadLiqudityReturn(ids, distributionX, distributionY, amountXIn);
}

export const EVENT_DELIMITER = ';?!';
/**
 * @notice Overrides Massa default createEvent function (use a custom delimiter to avoid collisions)
 *
 * Constructs a pretty formatted event with given key and arguments.
 *
 * @remarks
 * The result is meant to be used with the {@link generateEvent} function.
 * It is useful to generate events from an array.
 *
 * @param key - the string event key.
 *
 * @param args - the string array arguments.
 *
 * @returns the stringified event.
 *
 */
export function createEvent(key: string, args: Array<string>): string {
  return `${key}:`.concat(args.join(EVENT_DELIMITER));
}

/**
 * @notice Function to convert a u256 to a UTF-16 bytes then to a string
 * @dev u256.toString() is too expensive in as-bignum so we use this instead
 */
export function u256ToString(u: u256): string {
  return String.UTF16.decode(changetype<ArrayBuffer>(u));
}

/**
 * @notice Function to transfer remaining Massa coins to a recipient at the end of a call
 * @param balanceInit Initial balance of the SC (transferred coins + balance of the SC)
 * @param balanceFinal Balance of the SC at the end of the call
 * @param sent Number of coins sent to the SC
 * @param to Caller of the function to transfer the remaining coins to
 */
export function transferRemaining(
  balanceInit: u64,
  balanceFinal: u64,
  sent: u64,
  to: Address,
): void {
  if (balanceInit >= balanceFinal) {
    // Some operation might spend Massa by creating new storage space
    const spent = SafeMath.sub(balanceInit, balanceFinal);
    assert(spent <= sent, Storage__NotEnoughCoinsSent(spent, sent));
    if (spent < sent) {
      // SafeMath not needed as spent is always less than sent
      const remaining: u64 = sent - spent;
      _transferRemaining(to, remaining);
    }
  } else {
    // Some operation might unlock Massa by deleting storage space
    const received = SafeMath.sub(balanceFinal, balanceInit);
    const totalToSend: u64 = SafeMath.add(sent, received);
    _transferRemaining(to, totalToSend);
  }
}

function _transferRemaining(to: Address, value: u64): void {
  if (isAddressEoa(to.toString())) transferCoins(to, value);
  else call(to, 'receiveCoins', new Args(), value);
}
