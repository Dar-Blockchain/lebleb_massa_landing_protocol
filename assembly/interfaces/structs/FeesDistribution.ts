import { Args, Result, Serializable } from '@massalabs/as-types';
import { SCALE_OFFSET } from '../libraries/Constants';
import { u256 } from 'as-bignum/assembly/integer/u256';

/// @dev Structure used during swaps to distributes the fees:
export class FeesDistribution implements Serializable {
  /**
   * @param {u256} total - The total amount of fees
   * @param {u256} protocol - The amount of fees reserved for protocol
   */
  constructor(
    public total: u256 = u256.Zero,
    public protocol: u256 = u256.Zero,
  ) {}

  /**
   * Calculate the tokenPerShare when fees are added
   *
   * @param {u256} totalSupply - the total supply of a specific bin
   */
  getTokenPerShare(totalSupply: u256): u256 {
    // This can't overflow as `totalFees >= protocolFees`,
    // shift can't overflow
    const fees = u256.sub(this.total, this.protocol);
    const shifted = u256.shl(fees, SCALE_OFFSET);
    return u256.div(shifted, totalSupply); // unsafe Math is fine as div throws if division by 0
  }

  // ======================================================== //
  // ====                  SERIALIZATION                 ==== //
  // ======================================================== //

  serialize(): StaticArray<u8> {
    return new Args().add(this.total).add(this.protocol).serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);
    this.total = args.nextU256().expect('Failed to deserialize total fees');
    this.protocol = args
      .nextU256()
      .expect('Failed to deserialize protocol fees');
    return new Result(args.offset);
  }
}