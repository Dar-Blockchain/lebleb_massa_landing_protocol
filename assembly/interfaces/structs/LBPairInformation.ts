import { Args, Result, Serializable } from '@massalabs/as-types';
import { IPair } from '../IPair';
import { Address } from '@massalabs/massa-as-sdk';

/// Structure to store the LBPair information, such as:
export class LBPairInformation implements Serializable {
  /**
   * @param {u32} binStep - The bin step of the LBPair
   * @param {IPair} pair - The address of the LBPair
   * @param {bool} createdByOwner - Whether the LBPair was created by the owner or the factory
   * @param {bool} ignoredForRouting - Whether the LBPair is ignored for routing or not. An ignored pair will not be explored during routes finding
   */
  constructor(
    public binStep: u32 = 0,
    public pair: IPair = new IPair(new Address()),
    public createdByOwner: bool = false,
    public ignoredForRouting: bool = false,
  ) {}

  // ======================================================== //
  // ====                  SERIALIZATION                 ==== //
  // ======================================================== //

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.binStep)
      .add(this.pair._origin)
      .add(this.createdByOwner)
      .add(this.ignoredForRouting)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);
    this.binStep = args.nextU32().expect('Failed to deserialize binStep');
    this.pair = new IPair(
      new Address(args.nextString().expect('Failed to deserialize pair')),
    );
    this.createdByOwner = args
      .nextBool()
      .expect('Failed to deserialize createdByOwner');
    this.ignoredForRouting = args
      .nextBool()
      .expect('Failed to deserialize ignoredForRouting');
    return new Result(args.offset);
  }
}