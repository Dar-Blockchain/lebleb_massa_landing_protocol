import { BASIS_POINT_MAX, REAL_ID_SHIFT, SCALE_OFFSET } from './Constants';
import { u256, u128 } from 'as-bignum/assembly/index';
import {
  BinHelper__BinStepOverflows,
  BinHelper__IdOverflows,
  Math128x128__PowerUnderflow,
} from './Errors';

/// @notice Contract used to convert bin ID to price and back
export class BinHelper {
  /**
   * Returns the id corresponding to the given price
   * The id may be inaccurate due to rounding issues, always trust getPriceFromId rather than getIdFromPrice
   * @param _price The price of y per x as a 128.128-binary fixed-point number
   * @param _binStep The bin step
   * @return The id corresponding to this price
   */

  /**
   * Returns the price corresponding to the given ID, as a 128.128-binary fixed-point number
   * @param id - the id
   * @param binStep - the bin step
   * @returns The price corresponding to this id, as a 128.128-binary fixed-point number
   */
  static getPriceFromId(id: u64, binStep: u64): u256 {
    assert(id <= U32.MAX_VALUE, BinHelper__IdOverflows());

    const realId = i64(id) - REAL_ID_SHIFT;
    return this.power(this._getBPValue(binStep), realId);
  }

  /**
   * Returns the (1 + bp) value as a 128.128-decimal fixed-point number
   * @param _binStep The bp value in [1; 100] (referring to 0.01% to 1%)
   * @return The (1+bp) value as a 128.128-decimal fixed-point number
   */
  static _getBPValue(_binStep: u64): u256 {
    assert(
      _binStep != 0 && _binStep <= (BASIS_POINT_MAX as u64),
      BinHelper__BinStepOverflows(_binStep),
    );
    // can't overflow as `max(result) = 2**128 + 10_000 << 128 / 10_000 < max(u256)`
    return u256.add(
      u256.shl(u256.One, SCALE_OFFSET),
      u256.div(
        u256.shl(u256.from(_binStep), SCALE_OFFSET),
        u256.from(BASIS_POINT_MAX),
      ),
    );
  }

  /**
   * Returns the value of x^y. It calculates `1 / x^abs(y)` if x is bigger than 2^128.
   *  At the end of the operations, we invert the result if needed.
   * @param x The unsigned 128.128-binary fixed-point number for which to calculate the power
   * @param y A relative number without any decimals, needs to be between ]-2^20; 2^20[
   * @return The result of `x^y`
   */
  static power(x: u256, y: i64): u256 {
    let invert = false;
    let absY: i64 = 0;

    let result: u256 = u256.Zero;

    if (y == 0) return u256.shl(u256.One, SCALE_OFFSET);

    absY = y;
    if (absY < 0) {
      absY = sub(0, absY);
      invert = !invert;
    }

    if (absY < 0x100000) {
      result = u256.shl(u256.One, SCALE_OFFSET);
      let pow = x;
      if (u256.gt(x, u256.from(u128.Max))) {
        pow = u256.div(u256.Zero.not(), x);
        invert = !invert;
      }

      if (absY & 0x1) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x2) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x4) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x8) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x10) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x20) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x40) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x80) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x100) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x200) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x400) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x800) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x1000) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x2000) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x4000) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x8000) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x10000) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x20000) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x40000) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
      pow = u256.shr(u256.mul(pow, pow), 128);
      if (absY & 0x80000) {
        result = u256.shr(u256.mul(result, pow), 128);
      }
    }

    // revert if y is too big or if x^y underflowed
    assert(result != u256.Zero, Math128x128__PowerUnderflow(x, y));

    return invert ? u256.div(u256.Max, result) : result;
  }
}
