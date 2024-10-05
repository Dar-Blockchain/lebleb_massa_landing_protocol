import { Context, generateEvent, Address, call, Storage } from '@massalabs/massa-as-sdk';
import { Args, bytesToString, f64ToBytes, stringToBytes } from '@massalabs/as-types';
import { IERC20 } from '../interfaces/IERC20';
import { IReserve } from '../interfaces/IReserve';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { PersistentMap } from './lib/storage/mappingPersistant';
import {_getTokenPrice} from './collateral'
const RESERVE_PREFIX = "reserve:";
const COLLATERAL_FACTOR = u256.fromU64(150); // 150% collateral factor
const BORROW_RATE = u256.fromU64(75); // 75% borrow rate




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


export function constructor(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    return [];
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
    const asset = args.nextString().expect("Expected");
    const amount = args.nextU256().expect("Expected"); 

    const assetERC20 = new Address(asset);
    const assetArgs = new Args().add(asset).serialize();
    const reserveAddress = bytesToString(getReserve(assetArgs));

    const AtokenAddress: string = new IReserve(new Address(reserveAddress)).getAtokenAddress();
    new IERC20(assetERC20).transferFrom(Context.caller(), new Address(reserveAddress), amount);

    call(new Address(reserveAddress), "deposit", new Args().add(amount).add(Context.caller().toString()), 4_000_000);

    generateEvent("Deposit of " + amount.toString() + " into " + reserveAddress.toString());
    call(new Address(AtokenAddress), "mint", new Args().add(Context.caller().toString()).add(amount), 4_000_000);
}

export function borrow(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const borrowAsset = args.nextString().expect("Expected borrow asset");
    const amount = args.nextU256().expect("Expected amount");
    const collateralAsset = args.nextString().expect("Expected collateral asset");
    generateEvent(borrowAsset.toString())
    generateEvent(amount.toString())
    generateEvent("borrower "+Context.caller().toString())



    const collateralAssetArgs = new Args().add(collateralAsset).serialize();
    const collateralReserveAddress = bytesToString(getReserve(collateralAssetArgs));

    const availableToBorrow = new IReserve(new Address(collateralReserveAddress)).calculateAvailableToBorrow(Context.caller().toString());
    assert(availableToBorrow >= amount, "Borrow amount exceeds available amount");

    // Update the user's debt amount in the Lending Pool
    let userDebtAmount :u256
    
    if(userDebtAmounts.contains(Context.caller().toString()))
    {
        userDebtAmount = userDebtAmounts.getSome(Context.caller().toString())
    }
                        
    else{
        userDebtAmount = u256.Zero;
    }
    let newUserDebtAmount = u256.add(userDebtAmount, amount);
    userDebtAmounts.set(Context.caller().toString(), newUserDebtAmount);


    

    // Call borrow function on the Reserve contract
    const borrowAssetArgs = new Args().add(borrowAsset).serialize();
    const borrowReserveAddress = bytesToString(getReserve(borrowAssetArgs));
    generateEvent("Borrowed Contract " + borrowReserveAddress);

    call(new Address(borrowReserveAddress), "borrow", new Args().add(amount).add(Context.caller().toString()).add(collateralAsset), 4_000_000);
    generateEvent("Borrowed " + amount.toString() + " of " + borrowAsset + " using " + collateralAsset + " as collateral from " + borrowReserveAddress.toString());
}

export function repay(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const repayAsset = args.nextString().expect("Expected repay asset");
    const amount = args.nextU256().expect("Expected amount");

    // Fetch the reserve address for the repay asset
    const repayAssetArgs = new Args().add(repayAsset).serialize();
    const repayReserveAddress = bytesToString(getReserve(repayAssetArgs));

    // Retrieve the user's current debt amount
    const userAddress = Context.caller().toString();
    assert(userDebtAmounts.contains(userAddress), "No debt found for the user");
    const userDebtAmount = userDebtAmounts.getSome(userAddress);

    
    const repayAssetERC20 = new Address(repayAsset);
    new IERC20(repayAssetERC20).transferFrom(Context.caller(), new Address(repayReserveAddress), amount);

    // Update the user's debt
    const newUserDebtAmount = u256.sub(userDebtAmount, amount);
    userDebtAmounts.set(userAddress, newUserDebtAmount);

    
    

    // Call the repay function on the reserve contract to update its state
    call(new Address(repayReserveAddress), "repay", new Args().add(amount).add(userAddress), 4_000_000);

    // Generate event to log the repayment
    generateEvent("Repaid " + amount.toString() + " of " + repayAsset + " by " + userAddress);
}


export function calculateRewards(binaryArgs: StaticArray<u8>): void {
    const args = new Args(binaryArgs);
    const tokenAddress = args.nextString().expect("Expected token address");
    const userAddress = args.nextString().expect("Expected user address");

    // Get the reserve address associated with the token
    const reserveAddressBytes = getReserve(args.serialize());
    const reserveAddress = bytesToString(reserveAddressBytes);

    // Forward the calculate rewards call to the corresponding reserve
    call(new Address(reserveAddress), "calculateAndStoreRewards", new Args().add(userAddress), 4_000_000);

    generateEvent("Rewards calculation triggered for user: " + userAddress + " on reserve: " + reserveAddress);
}
export function getUserRewards(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const tokenAddress = args.nextString().expect("Expected token address");
    const userAddress = args.nextString().expect("Expected user address");

    // Get the reserve address associated with the token
    const reserveAddressBytes = getReserve(args.serialize());
    const reserveAddress = bytesToString(reserveAddressBytes);

    // Call the getUserRewards function on the Reserve contract
    return call(new Address(reserveAddress), "getUserRewards", new Args().add(userAddress), 4_000_000);
}


