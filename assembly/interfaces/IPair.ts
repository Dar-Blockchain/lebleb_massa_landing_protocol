import { Args, Result, Serializable } from "@massalabs/as-types";
import { Address, call, Storage } from "@massalabs/massa-as-sdk";
import { IERC20 } from "./IERC20";

const TOKEN_X = "TOKEN_X";
const TOKEN_Y = "TOKEN_Y";

class PairInformation implements Serializable {
    /**
     * @param {u32} activeId - The current id used for swaps, this is also linked with the price
     * @param {u64} reserveX - The sum of amounts of tokenX across all bins
     * @param {u64} reserveY - The sum of amounts of tokenY across all bins
     */
    constructor(
        public activeId: u32 = 0,
        public reserveX: u64 = 0,
        public reserveY: u64 = 0,
    ) {}

    // ======================================================== //
    // ====                  SERIALIZATION                 ==== //
    // ======================================================== //

    serialize(): StaticArray<u8> {
        return new Args()
            .add(this.activeId)
            .add(this.reserveX)
            .add(this.reserveY)
            .serialize();
    }

    deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
        const args = new Args(data, offset);
        this.activeId = args.nextU32().expect("Failed to deserialize activeId");
        this.reserveX = args.nextU64().expect("Failed to deserialize reserveX");
        this.reserveY = args.nextU64().expect("Failed to deserialize reserveY");
        return new Result(args.offset);
    }
}
export class IPair {
    _origin: Address;

    constructor(at: Address) {
        this._origin = at;
    }

    getTokenX(): IERC20 {
        return new IERC20(new Address(Storage.getOf(this._origin, TOKEN_X)));
    }

    getTokenY(): IERC20 {
        return new IERC20(new Address(Storage.getOf(this._origin, TOKEN_Y)));
    }

    getPairInformation(): PairInformation {
        const res = call(this._origin, "getPairInformation", new Args(), 0);
        return new Args(res).nextSerializable<PairInformation>().unwrap();
    }
}