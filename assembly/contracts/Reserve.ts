import { Context, generateEvent, Storage, Address } from '@massalabs/massa-as-sdk';
import { Args, stringToBytes, bytesToU256, bytesToString, u256ToBytes, bytesToU64, bytesToF64, f64ToBytes, bytesToU32 } from '@massalabs/as-types';

import { IERC20 } from '../interfaces/IERC20';
import { u256 } from 'as-bignum/assembly/integer/u256';
import {u256Tou64} from "./utils/cast"
import { PersistentMap } from './lib/storage/mappingPersistant';
import { u256toDecimalString } from 'as-bignum/assembly/utils';

export const regTokenAddress = 'reg_token_address';
export const regATokenAddress = 'reg_Atoken_address';
export const reserveKey = 'reg_Reserve';
export const Lending_Pool_Address = 'lending_Pool_Address';
export const _ReserveBalanceKey = stringToBytes('Reserve_Balance');
export const userBalances = new PersistentMap<string, u256>('_userBalances');
export const userBorrows = new PersistentMap<string, u256>('_userBorrows');
const userRewards = new PersistentMap<string, u256>('user_rewards');

const TOTAL_BORROWED_TOKENS_KEY = stringToBytes("total_borrowed_tokens");



export const BORROW_RATE = stringToBytes('BORROW_RATE');


export const borrow_coef = stringToBytes('borrow_coef');

export const supply_rate = stringToBytes('supply_rate');

export const PRECISION = stringToBytes('PRECISION')


export const LAST_REWARD_TIME_KEY: StaticArray<u8> = [0x14];


// Convert the rates by multiplying by the scaling factor and store them as u256
const MIN_REWARD_RATE = u256.fromU64(5*1000);    // 0.005 * 10000 = 50
const MIN_BORROW_RATE = u256.fromU64(30 * 1000);  // 0.03 * 10000 = 300
const MAX_REWARD_RATE = u256.fromU64(20 * 1000);  // 0.02 * 10000 = 200
const MAX_BORROW_RATE = u256.fromU64(100*1000); 
const SCALE_FACTOR = u256.fromU64(10_000);
const secondsInYear = u256.fromU64(365 * 24 * 3600);


const FULL_UTILIZATION = 0.8; 
class RateInfo {
    borrowRate: u256;
    rewardRate: u256;

    constructor(borrowRate: u256, rewardRate: u256) {
        this.borrowRate = borrowRate;
        this.rewardRate = rewardRate;
    }

    // Optional: You can add methods to handle or format rates if needed
    toString(): string {
        return `Borrow Rate: ${this.borrowRate.toString()}, Reward Rate: ${this.rewardRate.toString()}`;
    }
}


 


function LastRewardTimeKey(address: string): StaticArray<u8> {
    return LAST_REWARD_TIME_KEY.concat(stringToBytes(address));
  }
function setLastRewardTime(user: string, timestamp: u64): void {
    const key = LastRewardTimeKey(user);
    Storage.set(key, u256ToBytes(u256.fromU64(timestamp)));
}
function getLastRewardTime(user: string): u256 {
    
    const key = LastRewardTimeKey(user);
  return Storage.has(key) ? bytesToU256(Storage.get(key)) : u256.Zero;
}
export function constructor(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const tokenAddress = args.nextString().expect('Token address invalid');
    const AtokenAddress = args.nextString().expect('AToken address invalid');
    const LendingPoolAddress = args.nextString().expect("Lending address required");
    const BrrowRate = args.nextU256().expect("Borrow Rate required");
    Storage.set(regTokenAddress, tokenAddress.toString());
    Storage.set(regATokenAddress, AtokenAddress.toString());
    Storage.set(Lending_Pool_Address, LendingPoolAddress);
    Storage.set(_ReserveBalanceKey, u256ToBytes(u256.Zero));
    Storage.set(BORROW_RATE,u256ToBytes(BrrowRate))
    Storage.set(TOTAL_BORROWED_TOKENS_KEY,u256ToBytes(u256.Zero))
    const decimal=new IERC20(new Address(tokenAddress)).decimals();
    Storage.set(PRECISION,stringToBytes(decimal))

    generateEvent("Reserve of " + tokenAddress.toString() + " created and implemented with AToken " + AtokenAddress.toString());
}

function stringToU256(value: string): u256 {
    return bytesToU256(stringToBytes(value));
}

export function getAtokenAddress(): StaticArray<u8> {
    return stringToBytes(Storage.get(regATokenAddress));
}
export function getUserBalance(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const sender = args.nextString().expect("Expected the address");
    let ancientUserBalance = userBalances.contains(sender) ? userBalances.getSome(sender) : u256.Zero;

    return u256ToBytes(ancientUserBalance)

}
export function getUserBal(user:string): u256 {
    let ancientUserBalance = userBalances.contains(user) ? userBalances.getSome(user) : u256.Zero;

    return ancientUserBalance

}

export function getUserDebtAmount(binaryArgs: StaticArray<u8>):StaticArray<u8>{
    const args = new Args(binaryArgs);

    const sender = args.nextString().expect("Expected the sender address");
    let userBorrowed :u256;
    if( userBorrows.contains(sender))
    {
        userBorrowed= userBorrows.getSome(sender)
    }
    else{
        userBorrowed = u256.Zero;
    }

    return u256ToBytes(userBorrowed);
}
export function deposit(binaryArgs: StaticArray<u8>): void {
    const lendingPoolAddress = Storage.get(Lending_Pool_Address);
    assert(lendingPoolAddress == Context.caller().toString(), "Only Lending Pool can call deposit");

    const args = new Args(binaryArgs);
    const amount = args.nextU256().expect("Expected the deposit amount");
    const sender = args.nextString().expect("Expected the sender address");
    generateEvent("amount XXXXXX : " + amount.toString());

    const reserve = Storage.get(_ReserveBalanceKey);
    let reserveAmount = bytesToU256(reserve);
    let newReserveAmount = u256.add(reserveAmount, amount);

    Storage.set(_ReserveBalanceKey, u256ToBytes(newReserveAmount));

    let ancientUserBalance:u256;
    if(userBalances.contains(sender))
    {
        ancientUserBalance = userBalances.getSome(sender)
    }
    else{
        ancientUserBalance = u256.Zero
    }

    
    
    let newUserBalance = u256.add(ancientUserBalance, amount);
    generateEvent("newUserBalance: " + newUserBalance.toString());

    userBalances.set(sender, newUserBalance);
    generateEvent("User deposit: " + amount.toString() + " address:"+sender);
    // updateInterestRates();

    generateEvent("Reserve added with amount: " + amount.toString());
    generateEvent("Updated reserve amount: " + newReserveAmount.toString());
}



export function borrow(binaryArgs: StaticArray<u8>): void {
    const lendingPoolAddress = Storage.get(Lending_Pool_Address);
    assert(lendingPoolAddress == Context.caller().toString(), "Only Lending Pool can call borrow");

    const args = new Args(binaryArgs);
    const amount = args.nextU256().expect("Expected the borrow amount");
    const borrower = args.nextString().expect("Expected the borrower address");
    const collateralAsset = args.nextString().expect("Expected collateral asset");
    let userB = getUserBal(borrower);
    generateEvent(userB.toString()+" balA")


    let userBorrowed :u256;
    if( userBorrows.contains(borrower))
    {
        userBorrowed= userBorrows.getSome(borrower)
    }
    else{
        userBorrowed = u256.Zero;
    }
    let newUserBorrowed = u256.add(userBorrowed, amount);

    userBorrows.set(borrower, newUserBorrowed);
    
    // Get current total borrowed amount
    let totalBorrowed = getTotalBorrowedTokens();

    // Update the total borrowed amount
    totalBorrowed = u256.add(totalBorrowed, amount);

    Storage.set(TOTAL_BORROWED_TOKENS_KEY, u256ToBytes(totalBorrowed));
    const tokenAddress = Storage.get(regTokenAddress);
    generateEvent(tokenAddress.toString()+"__"+amount.toString()+"______");
    new IERC20(new Address(tokenAddress)).transfer(new Address(borrower), amount);

    // Lock the collateral in the reserve
    assert(userBalances.contains(borrower)," not found collateral")
    let collateralUserBalance = userBalances.getSome(borrower);

    let newCollateralUserBalance = u256.sub(collateralUserBalance, amount);
    userBalances.set(borrower, newCollateralUserBalance);
    // updateInterestRates();

    generateEvent("Borrowed " + amount.toString() + " to " + borrower);
    generateEvent("Locked " + amount.toString() + " of collateral from " + borrower);
}
function calculateAccruedInterestForRepay(borrower: string): u256 {
    // Get the current borrow rate (APR)
    const borrowRateBytes = Storage.get(borrow_coef);
    const borrowRate = bytesToF64(borrowRateBytes);  // Convert to f64

    // Get the user's total borrowed amount
    assert(userBorrows.contains(borrower), "No borrow found for the user");
    const principal = userBorrows.getSome(borrower);

    // Calculate the time elapsed since the last interest update
    const lastInterestTime = getLastRewardTime(borrower);  // Reuse this function to get the last interest calculation time
    const currentTime = u256.fromU64(Context.timestamp());
    const timeDifference = u256.sub(currentTime, lastInterestTime);

    // Convert time difference to seconds (assuming Context.timestamp() is in milliseconds)
    const timeDifferenceInSeconds = bytesToU64(u256ToBytes(timeDifference)) / 1000;

    // Calculate the interest using the formula: Interest = Principal * Rate * (Time / (365 * 24 * 3600))
    const principal_u64 = bytesToU64(u256ToBytes(principal));
    const interest = u256.fromF64(f64(principal_u64) * borrowRate * f64(timeDifferenceInSeconds) / (365 * 24 * 3600));

    generateEvent("Accrued interest for borrower: " + borrower + " is " + interest.toString());

    return interest;
}

export function repay(binaryArgs: StaticArray<u8>): void {
    const lendingPoolAddress = Storage.get(Lending_Pool_Address);
    assert(lendingPoolAddress == Context.caller().toString(), "Only Lending Pool can call repay");

    const args = new Args(binaryArgs);
    const amount = args.nextU256().expect("Expected the repay amount");
    const borrower = args.nextString().expect("Expected the borrower address");

    // Update the user's borrowed amount
    const _interest = calculateAccruedInterest(new Args().add(borrower).serialize());

    const interest=bytesToU256(_interest);
    
    assert(userBorrows.contains(borrower), "No borrow found for the user");
    const userBorrowed = userBorrows.getSome(borrower);

    const totalDue = u256.add(userBorrowed, interest);

    assert(amount <= totalDue, "Repay amount exceeds borrowed amount");

    const newUserBorrowed = u256.sub(userBorrowed, amount);
    if (newUserBorrowed == u256.Zero) {
        userBorrows.delete(borrower);
    } else {
        userBorrows.set(borrower, newUserBorrowed);
    }
    let totalBorrowed = getTotalBorrowedTokens();
    totalBorrowed = u256.sub(totalBorrowed, amount);
    Storage.set(TOTAL_BORROWED_TOKENS_KEY, u256ToBytes(totalBorrowed));
    // Update the reserve balance
    const reserve = Storage.get(_ReserveBalanceKey);
    const reserveAmount = bytesToU256(reserve);
    const newReserveAmount = u256.add(reserveAmount, amount);
    Storage.set(_ReserveBalanceKey, u256ToBytes(newReserveAmount));

    // Unlock collateral if the debt is fully repaid
    if (newUserBorrowed == u256.Zero) {
        const userCollateralBalance = userBalances.getSome(borrower);
        userBalances.set(borrower, u256.add(userCollateralBalance, amount));
        generateEvent("Collateral unlocked for " + borrower);
    }
    // updateInterestRates();

    generateEvent("Repayment of " + amount.toString() + " received from " + borrower);
    generateEvent("Updated reserve amount: " + newReserveAmount.toString());
}
function getTotalBorrowedTokens(): u256 {
    const totalBorrowedTokensBytes = Storage.get(TOTAL_BORROWED_TOKENS_KEY);

    return bytesToU256(totalBorrowedTokensBytes) ;
    
    
}



function calculateRates(): RateInfo {
    const totalLiquidity = getTotalDisponibleTokens();  // Available tokens in reserve
    const totalBorrowed = getTotalBorrowedTokens();     // Borrowed tokens in reserve

    // Scaling factor to handle fractional utilization (e.g., scale to 10000 for 4 decimal places)

    // Ensure totalLiquidity is not zero to avoid division by zero
    if (totalLiquidity == u256.Zero) {
        return new RateInfo(MIN_BORROW_RATE, MIN_REWARD_RATE);  // Return the minimum rates if no liquidity
    }

    // Calculate utilization: (totalBorrowed / totalLiquidity) * SCALE_FACTOR
    const utilization = u256.div(u256.mul(totalBorrowed, SCALE_FACTOR), totalLiquidity);

    // Define the min and max rates (multiplied by SCALE_FACTOR for integer math)
    const minBorrowRate = MIN_BORROW_RATE
    
    const maxBorrowRate =MAX_BORROW_RATE 
    
    const minRewardRate = MIN_REWARD_RATE
    
    const maxRewardRate = MAX_REWARD_RATE

    // Calculate the borrowRate and rewardRate based on utilization
    const borrowRate = u256.add(
        minBorrowRate,
        u256.div(u256.mul(u256.sub(maxBorrowRate, minBorrowRate), utilization), SCALE_FACTOR)
    );

    const rewardRate = u256.add(
        minRewardRate,
        u256.div(u256.mul(u256.sub(maxRewardRate, minRewardRate), utilization), SCALE_FACTOR)
    );
    const precision=Storage.get(PRECISION);
    const precision_decimal=bytesToU32(precision)
    // Ensure rewardRate is always less than the borrowRate (rewardRate = 90% of borrowRate if greater)
    let finalRewardRate:u256;
    if (rewardRate >= borrowRate) {
        finalRewardRate = u256.div(u256.mul(borrowRate, u256.fromU64(90)), u256.fromU64(100));  // Reward = 90% of borrowRate
    }
    
     finalRewardRate = u256.mul(rewardRate,u256.fromU64(10**precision_decimal))

    // Log the calculated rates (for debugging)
    generateEvent("Borrow Rate: " + borrowRate.toString());
    generateEvent("Reward Rate: " + finalRewardRate.toString());

    // Return the rates, converting them back to percentages by dividing by SCALE_FACTOR
    return new RateInfo(
        
        borrowRate,
   
        
        finalRewardRate
                 
    );
}

export function calculateUserRewards(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");
    const existingRewards = userRewards.contains(userAddress) ? userRewards.getSome(userAddress):u256.Zero;
    const precision=Storage.get(PRECISION);
    const precision_decimal=bytesToU32(precision)
    const prec_result=u256.from(u64(10 ** precision_decimal));

    const precision_Rewards=u256.div(existingRewards,prec_result)

    return u256ToBytes(precision_Rewards);

}

// Calculate and store rewards based on reserve utilization
export function calculateAndStoreRewards(binaryArgs: StaticArray<u8>): void{
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");

    // Get the rates (borrow and reward rates)
    const rateInfo = calculateRates();
    const borrowRate = rateInfo.borrowRate;  // Assuming borrowRate is already u256
    const rewardRate = rateInfo.rewardRate;  // Assuming rewardRate is already u256

    // Retrieve the user's balance
    const userBalance = userBalances.contains(userAddress) ? userBalances.getSome(userAddress) : u256.Zero;

    // Get the last reward time and the current timestamp
    const lastRewardTime = getLastRewardTime(userAddress);
    const currentTime = Context.timestamp();
    const timeDifference = currentTime - bytesToU64(u256ToBytes(lastRewardTime));  // In milliseconds

    // Convert timeDifference to seconds (u256 version)
    const timeDifferenceInSeconds = u256.div(u256.fromU64(timeDifference), u256.fromU64(1000));

    // Constants for time conversion (seconds in a year)

    // Calculate rewards as: (userBalance * rewardRate * timeDifferenceInSeconds) / secondsInYear
    let rewards = u256.Zero;
    const precision=Storage.get(PRECISION);

    const precision_decimal=bytesToU32(precision)
    const u256_precision=u256.from(u64(10 ** precision_decimal));
    const secondsInYear_prec=u256.mul(u256_precision,secondsInYear)
    if (userBalance > u256.Zero && timeDifference > 0) {
        rewards = u256.div(u256.mul(userBalance, u256.mul(rewardRate, timeDifferenceInSeconds)), secondsInYear_prec);
    }

    // Debugging information for logging
    generateEvent("userBalance: " + userBalance.toString() + " - rewardRate: " + rewardRate.toString() + " - timeDifference: " + timeDifference.toString());

    generateEvent("Rewards calculated for user: " + userAddress + " - Rewards: " + rewards.toString());

    // Retrieve existing rewards and add the new rewards to them
    const existingRewards = userRewards.contains(userAddress) ? userRewards.getSome(userAddress):u256.Zero;
    generateEvent("********" + existingRewards.toString());

    const newTotalRewards = u256.add(existingRewards, rewards);

    // Update the user's rewards balance in the PersistentMap
    userRewards.set(userAddress, newTotalRewards);

    // Update the last reward calculation time
    setLastRewardTime(userAddress, currentTime);

    generateEvent("Total rewards updated for user: " + userAddress + " - Total Rewards: " + newTotalRewards.toString());

    // Return the new total rewards as u256
}

export function calculateAccruedInterest(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");

    // Get the current borrow rate from calculateRates() (already in u256 format)
    const rateInfo = calculateRates();
    const borrowRate = rateInfo.borrowRate;

    // Log the current rates for debugging
    generateEvent("borrowRate: " + borrowRate.toString());

    // Get the user's current debt in u256
    const userDebt = userBorrows.contains(userAddress) ? userBorrows.getSome(userAddress) : u256.Zero;

    // Get the last time the interest was calculated for this user
    const lastInterestTime = getLastRewardTime(userAddress);

    // Get the current timestamp in milliseconds
    const currentTime = Context.timestamp();

    // Calculate the time difference in milliseconds
    const timeDifference = currentTime - bytesToU64(u256ToBytes(lastInterestTime));

    // If no time has passed, we can skip interest calculation
    if (timeDifference == 0) {
        generateEvent("No time difference; interest calculation skipped.");
        return u256ToBytes(u256.Zero);
    }

    // Convert timeDifference from milliseconds to seconds (using u256 division)
    const timeDifferenceInSeconds = u256.div(u256.fromU64(timeDifference), u256.fromU64(1000));

    // Constants for time conversion: seconds in a year (365 days)
    const secondsInYear = u256.fromU64(365 * 24 * 3600);  // Total seconds in a year

    // Calculate interest: Interest = (Principal * BorrowRate * TimeElapsedInSeconds) / SecondsInYear
    const interest = u256.div(u256.mul(userDebt, u256.mul(borrowRate, timeDifferenceInSeconds)), secondsInYear);

    // Log the calculated interest for debugging
    generateEvent("Accrued interest for user: " + userAddress + " is " + interest.toString());

    // Update the last interest calculation time
    setLastRewardTime(userAddress, currentTime);

    return u256ToBytes(interest)
    // Here, you can either return the interest or add it to the user's debt if required
    // Example: userBorrows.set(userAddress, u256.add(userDebt, interest));
}



function getTotalDisponibleTokens(): u256 {
    const totalDisponibleTokensBytes = Storage.get(_ReserveBalanceKey);
    return bytesToU256(totalDisponibleTokensBytes);
}







