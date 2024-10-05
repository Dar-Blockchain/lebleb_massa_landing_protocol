import { stringToBytes } from '@massalabs/as-types';
import { bytesToU256, u256ToBytes,Args } from '@massalabs/as-types';
import { Address, Storage,generateEvent } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';
import { TOTAL_SUPPLY_KEY, totalSupply } from '../token';

export const BALANCE_KEY_PREFIX = 'BALANCE';
export const ALLOWANCE_KEY_PREFIX = 'ALLOWANCE';


export const MINT_EVENT = 'MINT SUCCESS';

/**
 * Theses function are intended to be used in different token types (mintable, burnable...).
 * We define them and export in this file to avoid exporting them in the contract entry file,
 * making them callable from the outside world
 *
 */

/**
 * Returns the balance of a given address.
 *
 * @param address - address to get the balance for
 */
export function _balance(address: Address): u256 {
  const key = balanceKey(address);
  if (Storage.has(key)) {
    return bytesToU256(Storage.get(key));
  }
  return u256.Zero;
}

/**
 * Sets the balance of a given address.
 *
 * @param address - address to set the balance for
 * @param balance -
 */
export function _setBalance(address: Address, balance: u256): void {
  Storage.set(balanceKey(address), u256ToBytes(balance));
}

/**
 * @param address -
 * @returns the key of the balance in the storage for the given address
 */
function balanceKey(address: Address): StaticArray<u8> {
  return stringToBytes(BALANCE_KEY_PREFIX + address.toString());
}

/**
 * Sets the allowance of the spender on the owner's account.
 *
 * @param owner - owner address
 * @param spender - spender address
 * @param amount - amount to set an allowance for
 */
export function _approve(owner: Address, spender: Address, amount: u256): void {
  const key = allowanceKey(owner, spender);
  Storage.set(key, u256ToBytes(amount));
}

/**
 * Returns the allowance set on the owner's account for the spender.
 *
 * @param owner - owner's id
 * @param spender - spender's id
 *
 * @returns the allowance
 */
export function _allowance(owner: Address, spender: Address): u256 {
  const key = allowanceKey(owner, spender);
  return Storage.has(key) ? bytesToU256(Storage.get(key)) : u256.Zero;
}

/**
 * @param owner - address of the token owner
 * @param spender - address of the token spender
 * @returns the key of the allowance in the storage for the given addresses
 */
function allowanceKey(owner: Address, spender: Address): StaticArray<u8> {
  return stringToBytes(
    ALLOWANCE_KEY_PREFIX + owner.toString().concat(spender.toString()),
  );
}

export function _mint(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const recipient = new Address(
    args.nextString().expect('recipient argument is missing or invalid'),
  );
  const amount = args
    .nextU256()
    .expect('amount argument is missing or invalid');

  _increaseTotalSupply(amount);

  _increaseBalance(recipient, amount);

  generateEvent(MINT_EVENT);
}

/**
 * Adds amount of token to recipient.
 *
 * @param recipient -
 * @param amount -
 */
export function _increaseBalance(recipient: Address, amount: u256): void {
  const oldRecipientBalance = _balance(recipient);
  // @ts-ignore
  const newRecipientBalance = oldRecipientBalance + amount;

  // Check overflow
  assert(
    oldRecipientBalance < newRecipientBalance,
    'Requested mint amount causes an overflow',
  );

  _setBalance(recipient, newRecipientBalance);
}

/**
 * Increases the total supply of the token.
 *
 * @param amount - how much you want to increase the total supply
 */
export function _increaseTotalSupply(amount: u256): void {
  const oldTotalSupply = bytesToU256(totalSupply([]));
  // @ts-ignore
  const newTotalSupply = oldTotalSupply + amount;

  // Check overflow
  assert(
    oldTotalSupply < newTotalSupply,
    'Requested mint amount causes an overflow',
  );

  Storage.set(TOTAL_SUPPLY_KEY, u256ToBytes(newTotalSupply));
}

