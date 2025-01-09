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
const IS_INITIALIZED = stringToBytes("is_initialized"); // Tracks if constructor was called
const ADMIN_ADDRESS = stringToBytes("admin_address"); // Stores the admin address

const Oracle_Storage = stringToBytes("Oracle_Storage"); // Stores the admin address

const LIQUIDATOR_ADDRESS_KEY = stringToBytes("liquidator_address");

const userDebtAmounts = new PersistentMap<string, u256>('user_debt_amounts');
// const userDebtAssets = new PersistentMap<string, string>('user_debt_assets');
const userCollateralAssets = new PersistentMap<string, StaticArray<u8>>('user_collateral_assets');
const userDebtAssets = new PersistentMap<string, StaticArray<u8>>('user_debt_assets');
const userLiquidations = new PersistentMap<string, StaticArray<u8>>('user_liquidations');
const liquidationAmounts = new PersistentMap<string, u256>('liquidation_amounts');
let inFunction = false; // Reentrancy guard

// Utility function to serialize an array of strings using Args
function serializeStringArray(arr: Array<string>): StaticArray<u8> {
    return new Args().add(arr).serialize();
}

// Utility function to deserialize StaticArray<u8> to an array of strings using Args
function deserializeStringArray(data: StaticArray<u8>): Array<string> {
    return new Args(data).nextStringArray().expect("Failed to deserialize array of strings");
}


// Function to restrict access to the admin
function onlyAdmin(): void {
    const admin = Storage.get(ADMIN_ADDRESS);
    assert(admin != null && bytesToString(admin) == Context.caller().toString(), "Unauthorized: Only admin can perform this action");
}
export function constructor(binaryArgs: StaticArray<u8>): void{

    assert(!Storage.has(IS_INITIALIZED), "Constructor already called"); // Ensures it's only called once
    Storage.set(ADMIN_ADDRESS, stringToBytes(Context.caller().toString()));
    Storage.set(IS_INITIALIZED, stringToBytes("true"));

    

    const args = new Args(binaryArgs);

    
    const BrrowRate = args.nextU256().expect("Borrow Rate required");
    const OracleAddress = args.nextString().expect("Borrow Rate required");
    const liquidatorAddress = args.nextString().expect("Liquidator Address required"); // New argument for liquidator

   

    Storage.set(BORROWING_LIMIT_PERCENT,u256ToBytes(BrrowRate))
    Storage.set(Oracle_Storage, stringToBytes(OracleAddress));
    Storage.set(LIQUIDATOR_ADDRESS_KEY, stringToBytes(liquidatorAddress)); // Store liquidator address



}
/*export function getTokenPrice(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const tokenA = args.nextString().expect("Error while getting asset address");
    const oracleAddress = Storage.get(Oracle_Storage);
    let  prices = _getTokenPrice(tokenA,bytesToString(oracleAddress)) 
    generateEvent("price token is "+prices);

    return f64ToBytes(prices);
}*/



export function addReserve(binaryArgs: StaticArray<u8>): void {
    onlyAdmin()
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
    assert(!inFunction, "Reentrancy detected");
    inFunction = true;
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
    inFunction = false;

}
export function isLiquidatable(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");

    const totalCollateralValue = calculateTotalCollateralValue(userAddress);
    const totalDebtValue = calculateTotalDebtValue(userAddress);

    // Calculate the required collateral based on collateral factor
    const requiredCollateral = u256.mul(totalDebtValue, COLLATERAL_FACTOR);
    
    // Check if the actual collateral is less than required
    const liquidatable = totalCollateralValue < requiredCollateral;

    return liquidatable ? stringToBytes("true") : stringToBytes("false");
}
function recordLiquidation(userAddress: string, asset: string, amount: u256): void {
    // Update userLiquidations
    let liquidatedAssets: Array<string>;
    if (userLiquidations.contains(userAddress)) {
        liquidatedAssets = deserializeStringArray(userLiquidations.getSome(userAddress));
    } else {
        liquidatedAssets = [];
    }

    if (!liquidatedAssets.includes(asset)) {
        liquidatedAssets.push(asset);
        userLiquidations.set(userAddress, serializeStringArray(liquidatedAssets));
    }

    // Update liquidationAmounts
    const key = `${userAddress}:${asset}`;
    if (liquidationAmounts.contains(key)) {
        const existingAmount = liquidationAmounts.getSome(key);
        const updatedAmount = u256.add(existingAmount, amount);
        liquidationAmounts.set(key, updatedAmount);
    } else {
        liquidationAmounts.set(key, amount);
    }
}
export function liquidate(binaryArgs: StaticArray<u8>): void {
    assert(!inFunction, "Reentrancy detected");
    inFunction = true;

    const args = new Args(binaryArgs);
    const userAddress = args.nextString().expect("Expected user address");
    const liquidatorAddressBytes = Storage.get(LIQUIDATOR_ADDRESS_KEY);
    assert(liquidatorAddressBytes != null, "Liquidator address not set");
    const liquidatorAddress = bytesToString(liquidatorAddressBytes);

    // Check if the user is liquidatable
    const liquidatable = isLiquidatable(new Args().add(userAddress).serialize());
    // Check if the user is liquidatable
    assert(bytesToString(liquidatable) == "true", "User is not eligible for liquidation");

    // Fetch all collateral assets
    const collateralAssetsSerialized = userCollateralAssets.getSome(userAddress);
    const collateralAssets = deserializeStringArray(collateralAssetsSerialized).slice(0); // Clone the array to prevent mutation

    // Loop through each collateral asset
    for (let i = 0; i < collateralAssets.length; i++) {
        const collateralAsset = collateralAssets[i];
        const reserveAddress = bytesToString(getReserve(new Args().add(collateralAsset).serialize()));
        const reserve = new IReserve(new Address(reserveAddress));

        // Get user's collateral amount for this asset
        const collateralAmount = reserve.getUserCollateralAmount(userAddress);
        assert(collateralAmount > u256.Zero, "Collateral amount must be greater than zero");

        // Call the Reserve's liquidate function
        const reserveArgs = new Args().add(userAddress).add(liquidatorAddress) ;
        call(new Address(reserveAddress), "liquidate", reserveArgs, 4_000_000);

        // Record the liquidation
        recordLiquidation(userAddress, collateralAsset, collateralAmount);
    }

    // Fetch all debt assets
    const debtAssetsSerialized = userDebtAssets.getSome(userAddress);
    const debtAssets = deserializeStringArray(debtAssetsSerialized).slice(0); // Clone the array to prevent mutation

    // Loop through each debt asset
    for (let i = 0; i < debtAssets.length; i++) {
        const debtAsset = debtAssets[i];
        const reserveAddress = bytesToString(getReserve(new Args().add(debtAsset).serialize()));
        const reserve = new IReserve(new Address(reserveAddress));

        // Get user's debt amount for this asset
        const debtAmount = reserve.getUserDebtAmount(userAddress);
        assert(debtAmount > u256.Zero, "Debt amount must be greater than zero");

        // Transfer the debt asset from the liquidator to the reserve
        let debtAssetERC20 = new IERC20(new Address(debtAsset));
        debtAssetERC20.transferFrom(new Address(liquidatorAddress), new Address(reserveAddress), debtAmount);
        generateEvent("Transferred " + debtAmount.toString() + " of " + debtAsset + " from liquidator " + liquidatorAddress + " to reserve " + reserveAddress);

        // Call the Reserve's repay function
        const repayArgs = new Args().add(debtAmount).add(userAddress);
        call(new Address(reserveAddress), "repay", repayArgs, 4_000_000);
    }

    // Remove user's collateral and debt records
    userCollateralAssets.delete(userAddress);
    userDebtAssets.delete(userAddress);

    // Emit liquidation event
    generateEvent("User " + userAddress + " has been liquidated by " + liquidatorAddress + ". All collateral seized and debts cleared.");

    inFunction = false;
}

function calculateTotalCollateralValue(userAddress: string): u256 {
    let totalCollateralValue = u256.Zero;
    const collateralAssetsSerialized = userCollateralAssets.getSome(userAddress);
    const collateralAssets = new Args(collateralAssetsSerialized).nextStringArray().expect("Failed to deserialize collateral assets");

    for (let i = 0; i < collateralAssets.length; i++) {
        const collateralAsset = collateralAssets[i];
        const reserveAddress = bytesToString(getReserve(new Args().add(collateralAsset).serialize()));
        const reserve = new IReserve(new Address(reserveAddress));

        const collateralAmount = reserve.getUserCollateralAmount(userAddress);
        const oracleAddress = Storage.get(Oracle_Storage);
        let  prices = _getTokenPrice(collateralAsset,bytesToString(oracleAddress)) 
        const collateralValue = bytesToF64(stringToBytes(prices));
        // Ensure calculations stay within u256 type
        totalCollateralValue = u256.add(totalCollateralValue, u256.mul(u256.fromF64(collateralValue), collateralAmount));
    }

    return totalCollateralValue;
}


function calculateTotalDebtValue(userAddress: string): u256 {
    let totalDebtValue = u256.Zero;

    if (userDebtAssets.contains(userAddress)) {
        const debtAssetsSerialized = userDebtAssets.getSome(userAddress);
        const debtAssets = new Args(debtAssetsSerialized).nextStringArray().expect("Failed to deserialize debt assets");

        for (let i = 0; i < debtAssets.length; i++) {
            const debtAsset = debtAssets[i];
            const reserveAddress = bytesToString(getReserve(new Args().add(debtAsset).serialize()));
            const reserve = new IReserve(new Address(reserveAddress));

            const debtAmount = reserve.getUserDebtAmount(userAddress);
            const oracleAddress = Storage.get(Oracle_Storage);
            let  prices = _getTokenPrice(debtAsset,bytesToString(oracleAddress)) 
            const debtValue = bytesToF64(stringToBytes(prices));

            totalDebtValue = u256.add(totalDebtValue, u256.mul(u256.fromF64(debtValue), debtAmount));
        }
    }

    return totalDebtValue;
}


export function borrow(binaryArgs: StaticArray<u8>): void {
    assert(!inFunction, "Reentrancy detected");
    inFunction = true;
    const args = new Args(binaryArgs);
    const borrowAsset = args.nextString().expect("Expected borrow asset");
    const amount = args.nextU256().expect("Expected amount");
    const userAddress = Context.caller().toString();
    generateEvent("borrow1")
    const totalCollateralValue = calculateTotalCollateralValue(userAddress);
    generateEvent("borrow2")

    const totalDebtValue = calculateTotalDebtValue(userAddress);
    generateEvent("borrow3")
    const oracleAddress = Storage.get(Oracle_Storage);
    let  prices = _getTokenPrice(borrowAsset,bytesToString(oracleAddress)) 
    const _borrowingPrice = bytesToF64(stringToBytes(prices));
    generateEvent("borrow4")
    const borrowingLimitRate = Storage.get(BORROWING_LIMIT_PERCENT)
    const totalBorrowingPrice = u256.mul(u256.fromF64(_borrowingPrice), amount);
    const maxBorrowableAmount = u256.div(u256.mul(totalCollateralValue, bytesToU256(borrowingLimitRate)), u256.fromU64(100));
    generateEvent("borrow14")

    // Using <= for the comparison instead of lte
    assert(u256.add(totalBorrowingPrice,totalDebtValue) <= maxBorrowableAmount, "Exceeds max borrowable limit");
    generateEvent("borrow41")

    let updatedDebtAssets: Array<string>;

    if (userDebtAssets.contains(userAddress)) {
        updatedDebtAssets = deserializeStringArray(userDebtAssets.getSome(userAddress));
    } else {
        updatedDebtAssets = [];
    }
   
    generateEvent("borrow6")


    if (!updatedDebtAssets.includes(borrowAsset)) {
        updatedDebtAssets.push(borrowAsset);
        userDebtAssets.set(userAddress, serializeStringArray(updatedDebtAssets));
    }
        generateEvent("borrow5")


    const borrowReserveAddress = bytesToString(getReserve(new Args().add(borrowAsset).serialize()));
    generateEvent("borrow7")

    call(new Address(borrowReserveAddress), "borrow", new Args().add(amount).add(userAddress), 4_000_000);
    generateEvent("Borrowed " + amount.toString() + " of " + borrowAsset + " by " + userAddress);
    inFunction = false;
}

function remove<T>(array: Array<T>, element: T): Array<T> {
    const index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1); // Remove 1 element at the found index
    }
    return array;
}
export function repay(binaryArgs: StaticArray<u8>): void {
    assert(!inFunction, "Reentrancy detected");
    inFunction = true;
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
    inFunction = false;
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






