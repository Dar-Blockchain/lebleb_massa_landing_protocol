import { Context, generateEvent, Address, call, Storage } from '@massalabs/massa-as-sdk';
import { Args, bytesToString, f64ToBytes, stringToBytes,u256ToBytes,bytesToU64,bytesToU256, bytesToF64} from '@massalabs/as-types';


import { IERC20 } from '../interfaces/IERC20';
import { IReserve } from '../interfaces/IReserve';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { PersistentMap } from './lib/storage/mappingPersistant';
import {_getTokenPrice} from './collateral'
const RESERVE_PREFIX = "reserve:";
const COLLATERAL_FACTOR = u256.fromU64(150); // 150% collateral factor
const BORROW_RATE = u256.fromU64(75); // 75% borrow rate
const USDT=new Address("AS12N76WPYB3QNYKGhV2jZuQs1djdhNJLQgnm7m52pHWecvvj1fCQ");


export const BORROWING_LIMIT_PERCENT = stringToBytes('BORROWING_LIMIT_PERCENT');



const userDebtAmounts = new PersistentMap<string, u256>('user_debt_amounts');
// const userDebtAssets = new PersistentMap<string, string>('user_debt_assets');
const userCollateralAssets = new PersistentMap<string, StaticArray<u8>>('user_collateral_assets');
const userDebtAssets = new PersistentMap<string, StaticArray<u8>>('user_debt_assets');

// Utility function to serialize an array of strings using Args
function serializeStringArray(arr: Array<string>): StaticArray<u8> {
    return new Args().add(arr).serialize();
}

// Utility function to deserialize StaticArray<u8> to an array of strings using Args
function deserializeStringArray(data: StaticArray<u8>): Array<string> {
    return new Args(data).nextStringArray().expect("Failed to deserialize array of strings");
}


export function constructor(binaryArgs: StaticArray<u8>): void{
    const args = new Args(binaryArgs);

    
    const BrrowRate = args.nextU256().expect("Borrow Rate required");
    Storage.set(BORROWING_LIMIT_PERCENT,u256ToBytes(BrrowRate))


}
export function getTokenPrice(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const tokenA = args.nextString().expect("Error while getting asset address");
    const tokenB = args.nextString().expect("Error while getting reserve address");
    const amount=args.nextU256().expect("Error while getting reserve address");
    let  prices = _getTokenPrice(new Address(tokenA),new Address(tokenB)) 
    generateEvent("price token is "+prices.toString());

    return f64ToBytes(prices);
}
export function addReserve(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const assetAddress = args.nextString().expect("Error while getting asset address");
    const reserveAddress = args.nextString().expect("Error while getting reserve address");
    Storage.set(RESERVE_PREFIX + assetAddress, reserveAddress);
    generateEvent("Added reserve for asset: " + assetAddress + " with reserve address: " + reserveAddress);
}

export function getReserve(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const assetAddress = args.nextString().expect("Error while getting asset address");
    const reserveAddressBytes = Storage.get(RESERVE_PREFIX + assetAddress);
    assert(reserveAddressBytes != null, "Reserve address not found for the given asset address");
    return stringToBytes(reserveAddressBytes);
}

export function deposit(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const userAddress = Context.caller().toString();
    const asset = args.nextString().expect("Expected asset");
    const amount = args.nextU256().expect("Expected amount");

    // Update user collateral assets list efficiently
    // let existingCollateralAssetsSerialized: StaticArray<u8> | null ;


    let updatedCollateralAssets: Array<string>;

    if (userCollateralAssets.contains(userAddress)) {
        updatedCollateralAssets = deserializeStringArray(userCollateralAssets.getSome(userAddress));
    } else {
        updatedCollateralAssets = [];
    }

    if (!updatedCollateralAssets.includes(asset)) {
        updatedCollateralAssets.push(asset);
        userCollateralAssets.set(userAddress, serializeStringArray(updatedCollateralAssets));
    }

    // Call the deposit function on the respective reserve
    const reserveAddress = bytesToString(getReserve(new Args().add(asset).serialize()));
    let assetERC20=new Address(asset);
    new IERC20(assetERC20).transferFrom(Context.caller(), new Address(reserveAddress), amount);

    call(new Address(reserveAddress), "deposit", new Args().add(amount).add(userAddress), 4_000_000);
    const AtokenAddress: string = new IReserve(new Address(reserveAddress)).getAtokenAddress();
    generateEvent("Deposit of " + amount.toString() + " of " + asset + " by " + userAddress);

    call(new Address(AtokenAddress), "mint", new Args().add(Context.caller().toString()).add(amount), 4_000_000);

}
// Utility function to calculate the total collateral value of a user
function calculateTotalCollateralValue(userAddress: string): f64 {
    let totalCollateralValue: f64 = 0;
    
    // Fetch user's collateral assets
    const collateralAssetsSerialized = userCollateralAssets.getSome(userAddress);
    assert(collateralAssetsSerialized != null, "User has no collateral assets");

    const collateralAssets = deserializeStringArray(collateralAssetsSerialized);
    
    for (let i = 0; i < collateralAssets.length; i++) {
        const collateralAsset = collateralAssets[i];
        const reserveAddress = bytesToString(getReserve(new Args().add(collateralAsset).serialize()));
        const reserve = new IReserve(new Address(reserveAddress));

        // Get user's collateral amount for the asset
        const collateralAmount = bytesToU64(u256ToBytes(reserve.getUserCollateralAmount(userAddress)));

        // Get the price of the collateral asset relative to the reference asset (e.g., USDT)
        const collateralValue = _getTokenPrice(new Address(collateralAsset), USDT);

        totalCollateralValue += collateralValue * f64(collateralAmount);
    }

    return totalCollateralValue;
}

// Utility function to calculate the total debt value of a user
function calculateTotalDebtValue(userAddress: string): f64 {
    let totalDebtValue: f64 = 0;

    // Fetch user's debt assets
   

    if (userDebtAssets.contains(userAddress)) {
        let debtAssetsSerialized = userDebtAssets.getSome(userAddress);

        const debtAssets = deserializeStringArray(debtAssetsSerialized);
        
        for (let i = 0; i < debtAssets.length; i++) {
            const debtAsset = debtAssets[i];
            const reserveAddress = bytesToString(getReserve(new Args().add(debtAsset).serialize()));
            const reserve = new IReserve(new Address(reserveAddress));

            // Get user's debt amount for the asset
            const debtAmount = bytesToU64(u256ToBytes(reserve.getUserDebtAmount(userAddress)));

            // Get the price of the debt asset relative to the reference asset (e.g., USDT)
            const debtValue = _getTokenPrice(new Address(debtAsset), USDT);

            totalDebtValue += debtValue * f64(debtAmount);
        }
    }

    return totalDebtValue;
}

export function borrow(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const borrowAsset = args.nextString().expect("Expected borrow asset");
    const amount = args.nextU256().expect("Expected amount");
    const userAddress = Context.caller().toString();

    // Fetch user's collateral assets in one go
    const collateralAssetsSerialized = userCollateralAssets.getSome(userAddress);
    assert(collateralAssetsSerialized != null, "User has no collateral assets");

    const collateralAssets = deserializeStringArray(collateralAssetsSerialized);
    generateEvent("here"+collateralAssets.toString())
    const totalCollateralValue = calculateTotalCollateralValue(userAddress);
    generateEvent("Total collateral value: " + totalCollateralValue.toString());

    // Calculate total debt value
    const totalDebtValue = calculateTotalDebtValue(userAddress);
    generateEvent("Total debt value: " + totalDebtValue.toString());
    const _borrowingPrice = _getTokenPrice(new Address(borrowAsset),USDT)

    // Calculate maximum borrowable amount (25% of total collateral value)
    generateEvent("here+++")

    let Borrow = bytesToU64(Storage.get(BORROWING_LIMIT_PERCENT))
    let amountU64=bytesToU64(u256ToBytes(amount))
    let totalBorrowingPrice = _borrowingPrice*f64(amountU64)
    const maxBorrowableAmount = f64(totalCollateralValue)*f64(Borrow)/100;
    assert(totalBorrowingPrice+totalDebtValue <= maxBorrowableAmount, "Borrow amount exceeds 25% of total collateral value");

    // Update user's debt assets efficiently
    generateEvent("here++")

    let updatedDebtAssets: Array<string>;

    if (userDebtAssets.contains(userAddress)) {
        updatedDebtAssets = deserializeStringArray(userDebtAssets.getSome(userAddress));
    } else {
        updatedDebtAssets = [];
    }
   
    

    if (!updatedDebtAssets.includes(borrowAsset)) {
        updatedDebtAssets.push(borrowAsset);
        userDebtAssets.set(userAddress, serializeStringArray(updatedDebtAssets));
    }
    generateEvent("here")
    // Call the borrow function on the reserve
    const borrowReserveAddress = bytesToString(getReserve(new Args().add(borrowAsset).serialize()));
    call(new Address(borrowReserveAddress), "borrow", new Args().add(amount).add(Context.caller().toString()).add(collateralAssets), 4_000_000);

    generateEvent("Borrowed " + amount.toString() + " of " + borrowAsset + " by " + userAddress);
}
function remove<T>(array: Array<T>, element: T): Array<T> {
    const index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1); // Remove 1 element at the found index
    }
    return array;
}
export function repay(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const repayAsset = args.nextString().expect("Expected repay asset");
    const amount = args.nextU256().expect("Expected amount");
    const userAddress = Context.caller().toString();

    // Fetch the user's debt assets
    let updatedDebtAssets: Array<string>;

    if (userDebtAssets.contains(userAddress)) {
        updatedDebtAssets = deserializeStringArray(userDebtAssets.getSome(userAddress));
    } else {
        updatedDebtAssets = [];
    }

    // Check if the repay asset is in the user's debt assets
    assert(updatedDebtAssets.includes(repayAsset), "Asset not in user's debt assets");

    // Get the reserve address for the repay asset
    const repayReserveAddress = bytesToString(getReserve(new Args().add(repayAsset).serialize()));
    const reserve = new IReserve(new Address(repayReserveAddress));

    // Fetch user's total debt amount for this asset
    let userDebtAmount = reserve.getUserDebtAmount(userAddress);
    assert(amount <= userDebtAmount, "Repay amount exceeds user's debt amount");

    // Transfer the repay amount to the reserve
    let repayAssetERC20 = new Address(repayAsset);
    new IERC20(repayAssetERC20).transferFrom(Context.caller(), new Address(repayReserveAddress), amount);

    // Call the repay function on the reserve
    call(new Address(repayReserveAddress), "repay", new Args().add(amount).add(userAddress), 4_000_000);

    // Update the user's debt amount
    let newUserDebtAmount = u256.sub(userDebtAmount, amount);
    if (newUserDebtAmount==u256.Zero) {
        // If the debt is fully repaid, remove the asset from the user's debt list
        updatedDebtAssets = remove(updatedDebtAssets, repayAsset);

     }

    userDebtAssets.set(userAddress, serializeStringArray(updatedDebtAssets));

    generateEvent("Repaid " + amount.toString() + " of " + repayAsset + " by " + userAddress);
}



export function getRewardsForAsset(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");
    const asset = args.nextString().expect("Expected asset");

    // Get the reserve address for the asset
    const reserveAddress = bytesToString(getReserve(new Args().add(asset).serialize()));

    // Call the Reserve contract to calculate the rewards for the user
    const rewards = call(new Address(reserveAddress), "calculateAndStoreRewards", new Args().add(userAddress), 4_000_000);

    // Convert the rewards to u256

    const rewardsAmount = u256.fromF64(bytesToF64(rewards));
    const AtokenAddress: string = new IReserve(new Address(reserveAddress)).getAtokenAddress();

    // Call the mint function to mint aTokens for the user as rewards
    call(new Address(AtokenAddress), "mint", new Args().add(Context.caller().toString()).add(rewardsAmount), 4_000_000);

    generateEvent("Rewards minted for user: " + userAddress + " in aTokens, amount: " + rewardsAmount.toString());
}







