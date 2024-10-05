import {
    Args,
    bytesToNativeTypeArray,
    bytesToString,
  } from '@massalabs/as-types';
  import { Address, call, Storage } from '@massalabs/massa-as-sdk';
  import { LBPairInformation } from './structs/LBPairInformation';
  import { MAX_BIN_STEP, MIN_BIN_STEP, _sortTokens } from './libraries';
  import { u256 } from 'as-bignum/assembly/integer/u256';
  import { Preset } from './structs/Preset';
  import { OWNER_KEY } from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';
  
  export class IFactory {
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
     * Initialize the factory. This function must be called before any other function.
     *
     * @param {Address} _feeRecipient - The address of the fee recipient
     * @param {u64} _flashLoanFee - The value of the fee for flash loan
     */
    init(_feeRecipient: Address, _flashLoanFee: u256 = u256.Zero): void {
      const args = new Args().add(_feeRecipient).add(_flashLoanFee);
      call(this._origin, 'constructor', args, 0);
    }
  
    getLBPairInformation(
      _tokenA: Address,
      _tokenB: Address,
      _binStep: u64,
    ): LBPairInformation {
      const args = new Args().add(_tokenA).add(_tokenB).add(_binStep);
      const res = call(this._origin, 'getLBPairInformation', args, 0);
      return new Args(res).nextSerializable<LBPairInformation>().unwrap();
    }
  
    getAllLBPairs(_tokenX: Address, _tokenY: Address): LBPairInformation[] {
      const LBPairsAvailable: LBPairInformation[] = [];
      const tokens = _sortTokens(_tokenX, _tokenY);
  
      const _avLBPairBinSteps = this.getAvailableLBPairBinSteps(
        tokens.token0,
        tokens.token1,
      );
      const _nbAvailable = _avLBPairBinSteps.length;
  
      if (_nbAvailable > 0) {
        let _index = 0;
        for (let i = MIN_BIN_STEP; i <= MAX_BIN_STEP; ++i) {
          if (_avLBPairBinSteps[_index] != i) continue;
  
          const _LBPairInformation = this.getLBPairInformation(
            tokens.token0,
            tokens.token1,
            i,
          );
          LBPairsAvailable.push(_LBPairInformation);
          if (++_index == _nbAvailable) break;
        }
      }
  
      return LBPairsAvailable;
    }
  
    /**
     * @dev Create a new LBPair
     * @param _tokenA address of the first token
     * @param _tokenB address of the second token
     * @param _activeId active id disired
     * @param _binStep bin step disired
     * @param _masToSend Massa to send for storage
     * @returns the address of the new LBPair
     */
    createLBPair(
      _tokenA: Address,
      _tokenB: Address,
      _activeId: u32,
      _binStep: u32,
      _masToSend: u64,
    ): Address {
      const args = new Args()
        .add(_tokenA)
        .add(_tokenB)
        .add(_activeId)
        .add(_binStep);
      const res = call(this._origin, 'createLBPair', args, _masToSend);
      return new Address(bytesToString(res));
    }
  
    setPreset(
      _binStep: u32,
      _baseFactor: u32,
      _filterPeriod: u32,
      _decayPeriod: u32,
      _reductionFactor: u32,
      _variableFeeControl: u32,
      _protocolShare: u32,
      _maxVolatilityAccumulated: u32,
      _sampleLifeTime: u32,
    ): void {
      const args = new Args()
        .add(_binStep)
        .add(_baseFactor)
        .add(_filterPeriod)
        .add(_decayPeriod)
        .add(_reductionFactor)
        .add(_variableFeeControl)
        .add(_protocolShare)
        .add(_maxVolatilityAccumulated)
        .add(_sampleLifeTime);
      call(this._origin, 'setPreset', args, 0);
    }
  
    addQuoteAsset(_asset: Address): void {
      const args = new Args().add(_asset);
      call(this._origin, 'addQuoteAsset', args, 0);
    }
  
    getAvailableLBPairBinSteps(_tokenA: Address, _tokenB: Address): u32[] {
      const args = new Args().add(_tokenA).add(_tokenB);
      const res = call(this._origin, 'getAvailableLBPairBinSteps', args, 0);
      return bytesToNativeTypeArray<u32>(res);
    }
  
    getOwner(): Address {
      return new Address(Storage.getOf(this._origin, OWNER_KEY));
    }
  
    getPreset(binstep: u32): Preset {
      const args = new Args().add(binstep);
      const res = call(this._origin, 'getPreset', args, 0);
      return new Args(res).nextSerializable<Preset>().unwrap();
    }
  }