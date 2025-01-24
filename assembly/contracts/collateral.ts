import { Context, generateEvent, Storage, Address, sendMessage } from '@massalabs/massa-as-sdk';
import { Args, stringToBytes, bytesToU256, u256ToBytes, bytesToF64, bytesToU64 } from '@massalabs/as-types';
import { IERC20 } from '../interfaces/IERC20';
import { IFactory } from "../interfaces/IFactory";
import { IRouter } from "../interfaces/IRouter";

import{IOracle} from "../interfaces/IOracle"

import { u256 } from 'as-bignum/assembly';
import { PersistentMap } from './lib/storage/mappingPersistant';

export const FACTORY = new Address("AS125Y3UWiMoEx3w71jf7iq1RwkxXdwkEVdoucBTAmvyzGh2KUqXS");
export const ROUTER = new Address("AS1XqtvX3rz2RWbnqLfaYVKEjM3VS5pny9yKDdXcmJ5C1vrcLEFd");
export const ONE_UNIT = 10 ** 9;
// Define constants for collateral management
const COLLATERAL_THRESHOLD: f64 = 1.5; // Liquidation threshold (e.g., 150%)
const LIQUIDATION_BONUS: f64 = 0.05; // Bonus for liquidators (e.g., 5%)



const usdcAddress = new Address("AS1dJ8mrm2cVSdZVZLXo43wRx5FxywZ9BmxiUmXCy7Tx72XNbit8"); // Address of the USDC token
// Persistent storage maps to track user collaterals, debts, and liquidation statuses
const userCollaterals = new PersistentMap<string, u256>('user_collaterals');
const userDebts = new PersistentMap<string, u256>('user_debts');
const liquidationStatus = new PersistentMap<string, bool>('liquidation_status');

export function _getTokenPrice(tokenA: string,OracleAddress: string): string {
    
    const oracle = new IOracle(new Address(OracleAddress)); // Initialize the router interface
    const price = oracle.getPriceByAddress(tokenA)
    // Calculate the price by dividing the amount out by one unit
    return price ;
}



