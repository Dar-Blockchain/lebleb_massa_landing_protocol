import { u256 } from 'as-bignum/assembly/integer/u256';

export const REAL_ID_SHIFT: i64 = 1 << 23;
export const ID_ONE: u32 = 2 ** 23;
export const BASIS_POINT_MAX = 10_000;
export const PRECISION: u256 = u256.from(u64(10 ** 18));
export const ONE_COIN: u64 = 10 ** 9;
export const SCALE_OFFSET = 128;
export const MIN_BIN_STEP = 1;
export const MAX_BIN_STEP = 100;
export const MAX_PROTOCOL_SHARE = 2_500; // 25%
export const MAX_FEE: u64 = 10 ** 17; // 10%
