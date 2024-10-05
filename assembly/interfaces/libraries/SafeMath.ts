import { u256 } from 'as-bignum/assembly/integer/u256';

export class SafeMath {
  /**
   *
   * @param a
   * @param b
   * @returns Returns the addition of two unsigned integers,
   * reverting on overflow.
   */
  static add(a: u64, b: u64): u64 {
    const c: u64 = a + b;
    assert(c >= a, 'SafeMath: addition overflow');

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the integer division of two unsigned integers. Reverts with custom message on
   * division by zero. The result is rounded towards zero.
   */
  static sub(a: u64, b: u64): u64 {
    assert(b <= a, 'SafeMath: substraction overflow');
    const c: u64 = a - b;

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the multiplication of two unsigned integers, reverting on
   * overflow.
   */
  static mul(a: u64, b: u64): u64 {
    if (a == 0) {
      return 0;
    }

    const c = a * b;
    assert(c / a == b, 'SafeMath: multiplication overflow');

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the integer division of two unsigned integers. Reverts on
   * division by zero. The result is rounded towards zero.
   */
  static div(a: u64, b: u64): u64 {
    assert(b > 0, 'SafeMath: division by zero');
    const c = a / b;

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
   * Reverts with custom message when dividing by zero.
   */
  static mod(a: u64, b: u64): u64 {
    assert(b != 0, 'SafeMath: modulo by zero');
    return a % b;
  }
}

export class SafeMathU8 {
  /**
   *
   * @param a
   * @param b
   * @returns Returns the addition of two unsigned integers,
   * reverting on overflow.
   */
  static add(a: u8, b: u8): u8 {
    const c: u8 = a + b;
    assert(c >= a, 'SafeMath: addition overflow');

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the integer division of two unsigned integers. Reverts with custom message on
   * division by zero. The result is rounded towards zero.
   */
  static sub(a: u8, b: u8): u8 {
    assert(b <= a, 'SafeMathU8: substraction overflow');
    const c: u8 = a - b;

    return c;
  }
}

export class SafeMath256 {
  /**
   *
   * @param a
   * @param b
   * @returns Returns the addition of two unsigned integers,
   * reverting on overflow.
   */
  static add(a: u256, b: u256): u256 {
    const c = u256.add(a, b);
    assert(c >= a, 'SafeMath: addition overflow');

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the integer division of two unsigned integers. Reverts with custom message on
   * division by zero. The result is rounded towards zero.
   */
  static sub(a: u256, b: u256): u256 {
    assert(b <= a, 'SafeMath256: substraction overflow');
    const c = u256.sub(a, b);

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the multiplication of two unsigned integers, reverting on
   * overflow.
   */
  static mul(a: u256, b: u256): u256 {
    if (a.isZero()) {
      return u256.Zero;
    }

    const c = u256.mul(a, b);
    assert(u256.eq(u256.div(c, a), b), 'SafeMath: multiplication overflow');

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the integer division of two unsigned integers. Reverts on
   * division by zero. The result is rounded towards zero.
   */
  static div(a: u256, b: u256): u256 {
    assert(u256.gt(b, u256.Zero), 'SafeMath: division by zero');
    const c = u256.div(a, b);

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
   * Reverts with custom message when dividing by zero.
   */
  static mod(a: u256, b: u256): u256 {
    assert(!b.isZero(), 'SafeMath: modulo by zero');
    return u256.rem(a, b);
  }
}
