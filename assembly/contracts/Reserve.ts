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
export const PRECISION = stringToBytes('PRECISION');

export const LAST_REWARD_TIME_KEY: StaticArray<u8> = [0x14];
let inFunction = false; // Reentrancy guard

// Convert the rates by multiplying by the scaling factor and store them as u256
const MIN_REWARD_RATE = u256.fromU64(5 * 1000);    // 0.005 * 10000 = 50
const MIN_BORROW_RATE = u256.fromU64(30 * 1000);   // 0.03 * 10000 = 300
const MAX_REWARD_RATE = u256.fromU64(20 * 1000);   // 0.02 * 10000 = 200
const MAX_BORROW_RATE = u256.fromU64(100 * 1000);
const SCALE_FACTOR    = u256.fromU64(10_000);
const secondsInYear   = u256.fromU64(365 * 24 * 3600);

const FULL_UTILIZATION = 0.8; 
class RateInfo {
    borrowRate: u256;
    rewardRate: u256;

    constructor(borrowRate: u256, rewardRate: u256) {
        this.borrowRate = borrowRate;
        this.rewardRate = rewardRate;
    }

    toString(): string {
        return `Borrow Rate: ${bytesToString(u256ToBytes(this.borrowRate))}, Reward Rate: ${bytesToString(u256ToBytes(this.rewardRate))}`;
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
    Storage.set(BORROW_RATE, u256ToBytes(BrrowRate));
    Storage.set(TOTAL_BORROWED_TOKENS_KEY, u256ToBytes(u256.Zero));

    const decimal = new IERC20(new Address(tokenAddress)).decimals();
    Storage.set(PRECISION, stringToBytes(decimal));

    generateEvent("Reserve of " + tokenAddress.toString() + " created and implemented with AToken " + AtokenAddress.toString());
}

function stringToU256(value: string): u256 {
    return bytesToU256(stringToBytes(value));
}

export function getAtokenAddress(): StaticArray<u8> {
    return stringToBytes(Storage.get(regATokenAddress));
}

export function getUserCollateralAmount(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const sender = args.nextString().expect("Expected the address");
    let ancientUserBalance = userBalances.contains(sender) ? userBalances.getSome(sender) : u256.Zero;
    return u256ToBytes(ancientUserBalance);
}

export function getUserBalance(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const sender = args.nextString().expect("Expected the address");
    let ancientUserBalance = userBalances.contains(sender) ? userBalances.getSome(sender) : u256.Zero;
    return u256ToBytes(ancientUserBalance);
}

export function getUserBal(user: string): u256 {
    let ancientUserBalance = userBalances.contains(user) ? userBalances.getSome(user) : u256.Zero;
    return ancientUserBalance;
}

export function getUserDebtAmount(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const sender = args.nextString().expect("Expected the sender address");
    let userBorrowed: u256;
    if (userBorrows.contains(sender)) {
        userBorrowed = userBorrows.getSome(sender);
    } else {
        userBorrowed = u256.Zero;
    }
    return u256ToBytes(userBorrowed);
}

export function liquidate(binaryArgs: StaticArray<u8>): void {
    const lendingPoolAddress = Storage.get(Lending_Pool_Address);
    assert(lendingPoolAddress == Context.caller().toString(), "Only Lending Pool can call deposit");

    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");
    const liquidatorAddress = args.nextString().expect("Expected liquidator address");

    // Fetch and clear user's debt
    const userDebt = userBorrows.contains(userAddress) ? userBorrows.getSome(userAddress) : u256.Zero;
    assert(userDebt > u256.Zero, "User has no debt to repay");

    // Fetch and clear user's collateral
    const userCollateral = userBalances.contains(userAddress) ? userBalances.getSome(userAddress) : u256.Zero;
    assert(userCollateral > u256.Zero, "User has no collateral to seize");

    // --- FIX: Check for underflow before subtracting from reserveBalance ---
    const reserveBalance = bytesToU256(Storage.get(_ReserveBalanceKey));
    assert(userCollateral <= reserveBalance, "Underflow risk: userCollateral > reserveBalance");

    // Transfer collateral to liquidator
    const tokenAddress = Storage.get(regTokenAddress);
    const tokenERC20 = new IERC20(new Address(tokenAddress.toString()));
    tokenERC20.transfer(new Address(liquidatorAddress), userCollateral);

    // Update Reserve Balance
    const newReserveBalance = u256.sub(reserveBalance, userCollateral);
    Storage.set(_ReserveBalanceKey, u256ToBytes(newReserveBalance));
    generateEvent("Updated Reserve Balance: " + bytesToString(u256ToBytes(newReserveBalance)));

    // Clear user's debt
    userBorrows.delete(userAddress);
    generateEvent("Cleared debt for user " + userAddress);

    // Clear user's collateral
    userBalances.delete(userAddress);
    generateEvent("Cleared collateral for user " + userAddress);

    // Emit Liquidation Event
    generateEvent("Liquidated user " + userAddress + ". Collateral of " + bytesToString(u256ToBytes(userCollateral))+ " seized and debt of " + bytesToString(u256ToBytes(userDebt))+ " cleared.");
}

export function deposit(binaryArgs: StaticArray<u8>): void {
    const lendingPoolAddress = Storage.get(Lending_Pool_Address);
    assert(lendingPoolAddress == Context.caller().toString(), "Only Lending Pool can call deposit");

    const args = new Args(binaryArgs);
    const amount = args.nextU256().expect("Expected the deposit amount");
    const sender = args.nextString().expect("Expected the sender address");
    assert(amount > u256.Zero, "Deposit amount must be greater than zero");


    const reserve = Storage.get(_ReserveBalanceKey);
    let reserveAmount = bytesToU256(reserve);

    // --- FIX: Check for overflow before adding to reserveAmount ---
    assert(u256.add(reserveAmount, amount) >= reserveAmount, "Overflow risk: newReserveAmount < old reserveAmount");

    let newReserveAmount = u256.add(reserveAmount, amount);
    Storage.set(_ReserveBalanceKey, u256ToBytes(newReserveAmount));

    let ancientUserBalance: u256;
    if (userBalances.contains(sender)) {
        ancientUserBalance = userBalances.getSome(sender);
    } else {
        ancientUserBalance = u256.Zero;
    }

    // --- FIX: Check for overflow before adding to user balance ---
    assert(u256.add(ancientUserBalance, amount) >= ancientUserBalance, "Overflow risk: newUserBalance < old userBalance");

    let newUserBalance = u256.add(ancientUserBalance, amount);

    userBalances.set(sender, newUserBalance);

    calculateAndStoreRewards(new Args().add(sender).serialize());

   
}

export function borrow(binaryArgs: StaticArray<u8>): void {
    const lendingPoolAddress = Storage.get(Lending_Pool_Address);
    assert(lendingPoolAddress == Context.caller().toString(), "Only Lending Pool can call borrow");

    const args = new Args(binaryArgs);
    const amount = args.nextU256().expect("Expected the borrow amount");
    const borrower = args.nextString().expect("Expected the borrower address");

    let userB = getUserBal(borrower);

    let userBorrowed: u256;
    if (userBorrows.contains(borrower)) {
        userBorrowed = userBorrows.getSome(borrower);
    } else {
        userBorrowed = u256.Zero;
    }

    // --- FIX: Check for overflow before adding to userBorrowed ---
    assert(u256.add(userBorrowed, amount) >= userBorrowed, "Overflow risk: newUserBorrowed < old userBorrowed");

    let newUserBorrowed = u256.add(userBorrowed, amount);
    userBorrows.set(borrower, newUserBorrowed);

    // Get current total borrowed amount
    let totalBorrowed = getTotalBorrowedTokens();

    // --- FIX: Check for overflow before adding to totalBorrowed ---
    assert(u256.add(totalBorrowed, amount) >= totalBorrowed, "Overflow risk: totalBorrowed < old totalBorrowed");

    // Update the total borrowed amount
    totalBorrowed = u256.add(totalBorrowed, amount);
    Storage.set(TOTAL_BORROWED_TOKENS_KEY, u256ToBytes(totalBorrowed));

    const tokenAddress = Storage.get(regTokenAddress);
    new IERC20(new Address(tokenAddress)).transfer(new Address(borrower), amount);

    calculateAndStoreRewards(new Args().add(borrower).serialize());

    generateEvent("Borrowed " + bytesToString(u256ToBytes(amount)) + " to " + borrower);
    generateEvent("Locked " + bytesToString(u256ToBytes(amount)) + " of collateral from " + borrower);
}

export function withdrawAllCollateral(binaryArgs: StaticArray<u8>): void {
    const lendingPoolAddress = Storage.get(Lending_Pool_Address);
    assert(lendingPoolAddress == Context.caller().toString(), "Only Lending Pool can call borrow");

    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");

    // 1. Check the user still has no debt in this Reserve
    const userDebt = userBorrows.contains(userAddress) ? userBorrows.getSome(userAddress) : u256.Zero;
    assert(userDebt == u256.Zero, "User still has debt, cannot withdraw all collateral.");

    // 2. Fetch and reset user collateral
    const userCollateral = userBalances.contains(userAddress) ? userBalances.getSome(userAddress) : u256.Zero;
    assert(userCollateral > u256.Zero, "No collateral to withdraw.");

    // --- FIX: Check for underflow before subtracting from the reserve ---
    const reserveBalance = bytesToU256(Storage.get(_ReserveBalanceKey));
    assert(userCollateral <= reserveBalance, "Underflow risk: userCollateral > reserveBalance");

    // 3. Update this Reserve's balance
    const newReserveBalance = u256.sub(reserveBalance, userCollateral);
    Storage.set(_ReserveBalanceKey, u256ToBytes(newReserveBalance));

    // 4. Transfer tokens from Reserve to the user
    const tokenAddress = Storage.get(regTokenAddress); // e.g. USDC, USDT, etc.
    userBalances.set(userAddress, u256.Zero);
    new IERC20(new Address(tokenAddress)).transfer(new Address(userAddress), userCollateral);

   
}

export function repay(binaryArgs: StaticArray<u8>): void {
    const lendingPoolAddress = Storage.get(Lending_Pool_Address);
    assert(lendingPoolAddress == Context.caller().toString(), "Only Lending Pool can call repay");

    const args = new Args(binaryArgs);
    const amount = args.nextU256().expect("Expected the repay amount");
    const borrower = args.nextString().expect("Expected the borrower address");

    // Update the user's borrowed amount
    const _interest = calculateAccruedInterest(new Args().add(borrower).serialize());
    const interest = bytesToU256(_interest);

    assert(userBorrows.contains(borrower), "No borrow found for the user");
    const userBorrowed = userBorrows.getSome(borrower);

    const totalDue = u256.add(userBorrowed, interest);

    assert(amount <= totalDue, "Repay amount exceeds borrowed amount");

    // --- FIX: Check for underflow if 'amount' is bigger than 'userBorrowed' portion ---
    // Even though totalDue might be >= amount, we must ensure not to subtract more principal than exists.
    assert(amount <= userBorrowed, "Underflow risk: repay amount is bigger than userBorrowed principal portion");

    const newUserBorrowed = u256.sub(userBorrowed, amount);
    if (newUserBorrowed == u256.Zero) {
        userBorrows.delete(borrower);
    } else {
        userBorrows.set(borrower, newUserBorrowed);
    }

    let totalBorrowed = getTotalBorrowedTokens();

    // The original code already does: assert(amount <= totalBorrowed, "amount acceed the totalBorrowed");
    // We keep it as is, plus the new checks:
    assert(amount <= totalBorrowed, "Underflow risk: repay amount is bigger than total borrowed");

    totalBorrowed = u256.sub(totalBorrowed, amount);
    Storage.set(TOTAL_BORROWED_TOKENS_KEY, u256ToBytes(totalBorrowed));

    // Update the reserve balance
    const reserve = Storage.get(_ReserveBalanceKey);
    const reserveAmount = bytesToU256(reserve);

    // --- FIX: Check for overflow on 'reserve + amount' ---
    assert(u256.add(reserveAmount, amount) >= reserveAmount, "Overflow risk: newReserveAmount < old reserveAmount");

    const newReserveAmount = u256.add(reserveAmount, amount);
    Storage.set(_ReserveBalanceKey, u256ToBytes(newReserveAmount));

    // Unlock collateral if the debt is fully repaid
    if (newUserBorrowed == u256.Zero) {
        const userCollateralBalance = userBalances.getSome(borrower);

        // --- FIX: Check for overflow on 'userCollateralBalance + amount' ---
        assert(u256.add(userCollateralBalance, amount) >= userCollateralBalance, "Overflow risk: new userCollateralBalance < old userCollateralBalance");

        userBalances.set(borrower, u256.add(userCollateralBalance, amount));
        generateEvent("Collateral unlocked for " + borrower);
    }

    calculateAndStoreRewards(new Args().add(borrower).serialize());

}

function getTotalBorrowedTokens(): u256 {
    const totalBorrowedTokensBytes = Storage.get(TOTAL_BORROWED_TOKENS_KEY);
    return bytesToU256(totalBorrowedTokensBytes);
}

function calculateRates(): RateInfo {
    const totalAssets = u256.add(getTotalDisponibleTokens(), getTotalBorrowedTokens());
    assert(totalAssets != u256.Zero, "Total assets cannot be zero");

    const utilization = u256.div(u256.mul(getTotalBorrowedTokens(), SCALE_FACTOR), totalAssets);

    const borrowRate = u256.add(
        MIN_BORROW_RATE,
        u256.div(u256.mul(u256.sub(MAX_BORROW_RATE, MIN_BORROW_RATE), utilization), SCALE_FACTOR)
    );

    let rewardRate = u256.add(
        MIN_REWARD_RATE,
        u256.div(u256.mul(u256.sub(MAX_REWARD_RATE, MIN_REWARD_RATE), utilization), SCALE_FACTOR)
    );

    if (rewardRate >= borrowRate) {
        rewardRate = u256.div(u256.mul(borrowRate, u256.fromU64(90)), u256.fromU64(100));
    }

    return new RateInfo(borrowRate, rewardRate);
}

export function calculateUserRewards(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");
    const existingRewards = userRewards.contains(userAddress) ? userRewards.getSome(userAddress) : u256.Zero;

    const precision = Storage.get(PRECISION);
    const precision_decimal = bytesToU32(precision);
    const prec_result = u256.from(u64(10 ** precision_decimal));

    const precision_Rewards = u256.div(existingRewards, prec_result);
    return u256ToBytes(precision_Rewards);
}

// Calculate and store rewards based on reserve utilization
export function calculateAndStoreRewards(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");

    // Get the rates (borrow and reward rates)
    const rateInfo = calculateRates();
    const borrowRate = rateInfo.borrowRate;
    const rewardRate = rateInfo.rewardRate;

    // Retrieve the user's balance
    const userBalance = userBalances.contains(userAddress) ? userBalances.getSome(userAddress) : u256.Zero;

    // Get the last reward time and the current timestamp
    const lastRewardTime = getLastRewardTime(userAddress);
    const currentTime = Context.timestamp();
    const timeDifference = currentTime - bytesToU64(u256ToBytes(lastRewardTime));  // In milliseconds

    // Convert timeDifference to seconds (u256 version)
    const timeDifferenceInSeconds = u256.div(u256.fromU64(timeDifference), u256.fromU64(1000));

    let rewards = u256.Zero;
    const precision = Storage.get(PRECISION);
    const precision_decimal = bytesToU32(precision);
    const u256_precision = u256.from(u64(10 ** precision_decimal));
    const secondsInYear_prec = u256.mul(u256_precision, secondsInYear);

    if (userBalance > u256.Zero && timeDifference > 0) {
        rewards = u256.div(
            u256.mul(userBalance, u256.mul(rewardRate, timeDifferenceInSeconds)),
            secondsInYear_prec
        );
    }

   

    const existingRewards = userRewards.contains(userAddress) ? userRewards.getSome(userAddress) : u256.Zero;

    const newTotalRewards = u256.add(existingRewards, rewards);

    userRewards.set(userAddress, newTotalRewards);
    setLastRewardTime(userAddress, currentTime);

    generateEvent("Total rewards updated for user: " + userAddress + " - Total Rewards: " + bytesToString(u256ToBytes(newTotalRewards)));
}

export function calculateAccruedInterest(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");

    const rateInfo = calculateRates();
    const borrowRate = rateInfo.borrowRate;

    const userDebt = userBorrows.contains(userAddress) ? userBorrows.getSome(userAddress) : u256.Zero;
    const lastInterestTime = getLastRewardTime(userAddress);
    const currentTime = Context.timestamp();
    const timeDifference = currentTime - bytesToU64(u256ToBytes(lastInterestTime));

    if (timeDifference == 0) {
        generateEvent("No time difference; interest calculation skipped.");
        return u256ToBytes(u256.Zero);
    }

    const timeDifferenceInSeconds = u256.div(u256.fromU64(timeDifference), u256.fromU64(1000));
    const secondsInYear = u256.fromU64(365 * 24 * 3600);

    // Interest = (Principal * BorrowRate * TimeElapsedInSeconds) / SecondsInYear
    const interest = u256.div(
        u256.mul(userDebt, u256.mul(borrowRate, timeDifferenceInSeconds)),
        secondsInYear
    );

    generateEvent("Accrued interest for user: " + userAddress + " is " + bytesToString(u256ToBytes(interest)));

    // Update the last interest calculation time
    setLastRewardTime(userAddress, currentTime);

    return u256ToBytes(interest);
}

function getTotalDisponibleTokens(): u256 {
    const totalDisponibleTokensBytes = Storage.get(_ReserveBalanceKey);
    return bytesToU256(totalDisponibleTokensBytes);
}

export function claimRewards(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");

    calculateAndStoreRewards(new Args().add(userAddress).serialize());

    const totalRewards = userRewards.contains(userAddress) ? userRewards.getSome(userAddress) : u256.Zero;
    assert(totalRewards > u256.Zero, "No rewards available to claim");

    userRewards.set(userAddress, u256.Zero);

    const tokenAddress = Storage.get(regTokenAddress);
    new IERC20(new Address(tokenAddress)).transfer(new Address(userAddress), totalRewards);

    generateEvent("User " + userAddress + " claimed rewards: " + bytesToString(u256ToBytes(totalRewards)));
}
