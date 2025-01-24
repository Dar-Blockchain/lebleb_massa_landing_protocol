import {
    Args,
    bytesToString,
    bytesToU256,
   
  } from '@massalabs/as-types';
  import { u256 } from 'as-bignum/assembly';

  import { Address, call } from '@massalabs/massa-as-sdk';
  
export class IReserve{
     constructor(public _origin: Address) {}
     getAtokenAddress(): string {
        const res = call(
          this._origin,
          'getAtokenAddress',
          new Args(),
          0,
        );
        return bytesToString(res);
      }

      calculateAvailableToBorrow(user:string) : u256{
        const res = call(
          this._origin,
          'calculateAvailableToBorrow',
          new Args().add(user),
          0,
        );
        return bytesToU256(res);
      }

      getUserCollateralAmount(user:string):u256{
        const res = call(
          this._origin,
          'getUserCollateralAmount',
          new Args().add(user),
          0,
        );
        return bytesToU256(res);

        
      }
      withdrawAllCollateral(user:string):u256{
        const res = call(
          this._origin,
          'getUserDebtAmount',
          new Args().add(user),
          0,
        );
        return bytesToU256(res);

        
      }
      getUserDebtAmount(user:string):u256{
        const res = call(
          this._origin,
          'getUserDebtAmount',
          new Args().add(user),
          0,
        );
        return bytesToU256(res);

        
      }
      liquidate(user:string,liquidator:string):u256{
        const res = call(
          this._origin,
          'getUserDebtAmount',
          new Args().add(user).add(liquidator),
          0,
        );
        return bytesToU256(res);

        
      }


      

      
      

}