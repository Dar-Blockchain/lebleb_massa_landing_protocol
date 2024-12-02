import {
    Args,
    bytesToString,
    bytesToU256,
   
  } from '@massalabs/as-types';
  import { u256 } from 'as-bignum/assembly';

  import { Address, call } from '@massalabs/massa-as-sdk';
  
export class IOracle{
     constructor(public _origin: Address) {}
     getPriceByAddress(token:string): string {
        const res = call(
          this._origin,
          'getPriceByAddress',
          new Args().add(token),
          0,
        );
        return bytesToString(res);
      }

     

      
      

}