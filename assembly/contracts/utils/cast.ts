import { Args, stringToBytes, bytesToU256, bytesToString, u256ToBytes, bytesToU64, bytesToF64, f64ToBytes } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly/integer/u256';



export function u256Tou64(x:u256):u64
{
    const x_bytes=u256ToBytes(x);
    return bytesToU64(x_bytes);
}