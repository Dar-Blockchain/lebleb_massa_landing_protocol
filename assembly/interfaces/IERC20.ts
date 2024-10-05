import { Args, Result, Serializable } from "@massalabs/as-types";
import { Address, Context, call } from "@massalabs/massa-as-sdk";
import { TokenWrapper } from "./TokenWrapper";

export class IERC20 extends TokenWrapper implements Serializable {
    constructor(origin: Address = new Address()) {
        super(origin);
    }

    init(name: string, symbol: string, decimals: u8, supply: u64): void {
        const args = new Args().add(name).add(symbol).add(decimals).add(supply);
        call(this._origin, "constructor", args, 0);
    }

    /**
     * Returns the amount of token received by the pair
     *
     * @param {u64} reserve - The total reserve of token
     * @param {u64} fees - The total fees of token
     *
     * @return {u64} - The amount received by the pair
     */
    received(reserve: u64, fees: u64): u64 {
        const balance = this.balanceOf(Context.callee());
        const received = balance - (reserve + fees);
        return received;
    }

    serialize(): StaticArray<u8> {
        return this._origin.serialize();
    }

    deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
        return this._origin.deserialize(data, offset);
    }


    notEqual(other: IERC20): bool {
        return this._origin.notEqual(other._origin);
    }

    equals(other: IERC20): bool {
        return this._origin.equals(other._origin);
    }
}