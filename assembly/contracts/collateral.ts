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



// export function checkAndLiquidateUserCollateral(user: string,COLLATERAL_TOKEN:string): void {
//     // Ensure the user has collateral
//     assert(userCollaterals.contains(user), "User has no collateral recorded.");
//     const collateralAmount = userCollaterals.getSome(user);
//     const debtAmount = userDebts.contains(user) ? userDebts.getSome(user) : u256.Zero;

//     // Fetch the price of the collateral token in terms of USDC
//     const collateralTokenAddress = new Address(COLLATERAL_TOKEN);
//     const stableCoinAddress = usdcAddress
//     const collateralPrice = _getTokenPrice(collateralTokenAddress, stableCoinAddress,u256.One);
//     let collateralAmount64=bytesToU64(u256ToBytes(collateralAmount))
//     const collateralValue = f64(collateralAmount64) * collateralPrice;
//     let debtValue64=bytesToU64(u256ToBytes(debtAmount))
//     const debtValue = f64(debtValue64);


//     const collateralRatio = collateralValue / debtValue;
//     generateEvent("Collateral ratio for user " + user + ": " + collateralRatio.toString());

//     if (collateralRatio < COLLATERAL_THRESHOLD) {
//         initiateLiquidation(user);
//     }

//     // Schedule the next execution of this function using sendMessage
//     const nextPeriod = Context.currentPeriod() + 1;
//     const nextThread = Context.currentThread();
//     sendMessage(
//         Context.caller(), // Address of the same contract
//         "checkAndLiquidateUserCollateral", // Function name to call
//         nextPeriod,  // Next period for execution
//         nextThread,  // Next thread for execution
//         nextPeriod + 5,  // Expiration period
//         nextThread,  // Expiration thread
//         1_000_000,   // Gas limit
//         0,           // Coins transferred
//         0,           // Additional data
//         []           // Empty byte array
//     );
// }



// function initiateLiquidation(user: string): void {
//     assert(userCollaterals.contains(user), "No collateral found for the user.");

//     const userCollateral = userCollaterals.getSome(user);
//     const liquidationAmount = calculateLiquidationAmount(userCollateral);

//     // Set user liquidation status to true to avoid multiple liquidations
//     liquidationStatus.set(user, true);

//     // Call the liquidation function using sendMessage
//     sendMessage(
//         Context.caller(),  // Address of the same contract
//         "liquidate",           // Function name to call
//         Context.currentPeriod() + 1,  // Next period
//         Context.currentThread(),      // Next thread
//         Context.currentPeriod() + 5,  // Expiration period
//         Context.currentThread(),      // Expiration thread
//         1_000_000,            // Gas limit
//         0,                    // Coins transferred
//         0,                    // Additional data
//         []                    // Empty byte array
//     );

//     generateEvent("User " + user + " initiated for liquidation.");
// }

// function calculateLiquidationAmount(collateral: u256): u256 {
//     // Calculate the liquidation amount, including any bonus or fees for liquidators
//     let collateral64=bytesToU64(u256ToBytes(collateral))
//     const bonusAmount = u256.fromF64(f64(collateral64) * LIQUIDATION_BONUS);
//     return u256.add(collateral, bonusAmount);
// }
