import { Args, bytesToU64 } from "@massalabs/as-types";
import { Address, call } from "@massalabs/massa-as-sdk";
import { IERC20 } from "./IERC20";
import { IPair } from "./IPair";
import { u256 } from 'as-bignum/assembly/integer/u256';

import {
    AddLiquidity,
    Amounts,
    GetSwapInReturn,
    GetSwapOutReturn,
  } from './structs/Returns';
  
export class IRouter {
    _origin: Address;

    /**
     * Wraps a smart contract exposing standard token FFI.
     *
     * @param {Address} at - Address of the smart contract.
     */
    constructor(at: Address) {
        this._origin = at;
    }

    /**
     * Swaps exact tokens for tokens while performing safety checks
     *
     * @param {u64} amountIn - The amount of tokens to send
     * @param {u64} amountOutMin - The min amount of tokens to receive
     * @param {Array<u64>} pairBinSteps - The bin step of the pairs (0: V1, other values will use V2)
     * @param {IERC20[]} tokenPath - The swap path using the binSteps following `_pairBinSteps`
     * @param {Address} to - The address of the recipient
     * @param {u64} deadline - The deadline of the tx
     */
    swapExactTokensForTokens(
        amountIn: u64,
        amountOutMin: u64,
        pairBinSteps: Array<u64>,
        tokenPath: IERC20[],
        to: Address,
        deadline: u64,
    ): u64 {
        const args = new Args()
            .add(amountIn)
            .add(amountOutMin)
            .add(pairBinSteps)
            .addSerializableObjectArray(tokenPath)
            .add(to)
            .add(deadline);
        const res = call(this._origin, "swapExactTokensForTokens", args, 0);
        return bytesToU64(res);
    }

    getSwapIn(_pair: IPair, _amountOut: u256, _swapForY: bool): GetSwapInReturn {
        const args = new Args().add(_pair._origin).add(_amountOut).add(_swapForY);
        const result = new Args(call(this._origin, 'getSwapIn', args, 0));
        return new GetSwapInReturn(
          result.nextU256().unwrap(),
          result.nextU256().unwrap(),
        );
      }
    
      getSwapOut(_pair: IPair, _amountIn: u256, _swapForY: bool): GetSwapOutReturn {
        const args = new Args().add(_pair._origin).add(_amountIn).add(_swapForY);
        const result = new Args(call(this._origin, 'getSwapOut', args, 0));
        return new GetSwapOutReturn(
          result.nextU256().unwrap(),
          result.nextU256().unwrap(),
        );
      }

}