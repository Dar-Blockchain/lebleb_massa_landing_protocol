import { Args, Result, Serializable } from '@massalabs/as-types';

/// @dev Structure to store the protocol fees:
export class Preset implements Serializable {
  /**
   * @param {u32} binStep - The bin step
   * @param {u32} baseFactor - The base factor
   * @param {u32} filterPeriod - The filter period, where the fees stays constant
   * @param {u32} decayPeriod - The decay period, where the fees are halved
   * @param {u32} reductionFactor - The reduction factor, used to calculate the reduction of the accumulator
   * @param {u32} variableFeeControl - The variable fee control, used to control the variable fee, can be 0 to disable them
   * @param {u32} protocolShare - The share of fees sent to protocol
   * @param {u32} maxVolatilityAccumulated - The max value of volatility accumulated
   * @param {u32} sampleLifetime - The value of volatility accumulated
   */
  constructor(
    public binStep: u32 = 0,
    public baseFactor: u32 = 0,
    public filterPeriod: u32 = 0,
    public decayPeriod: u32 = 0,
    public reductionFactor: u32 = 0,
    public variableFeeControl: u32 = 0,
    public protocolShare: u32 = 0,
    public maxVolatilityAccumulated: u32 = 0,
    public sampleLifetime: u32 = 0,
  ) {}

  // ======================================================== //
  // ====                  SERIALIZATION                 ==== //
  // ======================================================== //

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.binStep)
      .add(this.baseFactor)
      .add(this.filterPeriod)
      .add(this.decayPeriod)
      .add(this.reductionFactor)
      .add(this.variableFeeControl)
      .add(this.protocolShare)
      .add(this.maxVolatilityAccumulated)
      .add(this.sampleLifetime)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);
    this.binStep = args.nextU32().expect('Failed to deserialize binStep');
    this.baseFactor = args.nextU32().expect('Failed to deserialize baseFactor');
    this.filterPeriod = args
      .nextU32()
      .expect('Failed to deserialize filterPeriod');
    this.decayPeriod = args
      .nextU32()
      .expect('Failed to deserialize decayPeriod');
    this.reductionFactor = args
      .nextU32()
      .expect('Failed to deserialize reductionFactor');
    this.variableFeeControl = args
      .nextU32()
      .expect('Failed to deserialize variableFeeControl');
    this.protocolShare = args
      .nextU32()
      .expect('Failed to deserialize protocolShare');
    this.maxVolatilityAccumulated = args
      .nextU32()
      .expect('Failed to deserialize maxVolatilityAccumulated');
    this.sampleLifetime = args
      .nextU32()
      .expect('Failed to deserialize sampleLifetime');
    return new Result(args.offset);
  }
}