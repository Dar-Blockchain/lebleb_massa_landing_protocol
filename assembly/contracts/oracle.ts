import { Context, generateEvent, Address, call, Storage } from '@massalabs/massa-as-sdk';
import { PersistentMap } from './lib/storage/mappingPersistant';
import { Args, stringToBytes, Result, Serializable, bytesToU256, bytesToString, u256ToBytes, bytesToU64, bytesToF64, f64ToBytes, bytesToU32 } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly/integer/u256';

// Define TokenData structure with symbol, address, and price (string)
class TokenData implements Serializable {
    constructor(
        public symbol: string = "",
        public address: string = "",
        public price: u256 = u256.Zero,
    ) {}

    // Serialize the TokenData instance into a StaticArray<u8>
    serialize(): StaticArray<u8> {
        return new Args()
            .add(this.symbol)
            .add(this.address)
            .add(this.price)
            .serialize();
    }

    // Deserialize a StaticArray<u8> back into a TokenData instance
    deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
        const args = new Args(data, offset);
        this.symbol = args.nextString().expect("Failed to deserialize symbol");
        this.address = args.nextString().expect("Failed to deserialize address");
        this.price = args.nextU256().expect("Failed to deserialize price");
        return new Result(args.offset);
    }
}

// Persistent storage for user rewards (map of token symbol to TokenData)
const tokens = new PersistentMap<string, TokenData>('user_rewards');

// Index to map address to symbol for faster lookups
const addressIndex = new PersistentMap<string, string>('address_index');
const ADMIN_ADDRESS = stringToBytes("admin_address");
// Add new token data (only admin can call this)
export function addToken(binaryArgs: StaticArray<u8>): void {
    onlyAdmin()

    const args = new Args(binaryArgs);

    const symbol = args.nextString().expect("Failed to parse symbol");
    const address = args.nextString().expect("Failed to parse address");
    const price = args.nextU256().expect("Failed to parse price");

    // Check if the symbol already exists in the map
    if (tokens.contains(symbol)) {
        generateEvent('TokenAlreadyExists' + 'Token Already Exists: Symbol: ' + symbol);
        return; // Prevent adding a duplicate token
    }

    // Add new token data to the PersistentMap
    const tokenData = new TokenData(symbol, address, price);
    tokens.set(symbol, tokenData);

    // Index address to symbol for quick lookup
    addressIndex.set(address, symbol);

    // Generate an event instead of logging (serialize the TokenData as a string)
    generateEvent('TokenAdded' + 'Token Added: Symbol: ' + symbol + ' Address: ' + address + ' Price: ' + bytesToString(u256ToBytes(price)));
}

// Update the price of existing tokens (only admin can call this)
export function updatePrices(binaryArgs: StaticArray<u8>): void {
    onlyAdmin()

    const args = new Args(binaryArgs);

    const symbolArray = args.nextStringArray().expect('Failed to parse symbols');
    const addressArray = args.nextStringArray().expect('Failed to parse addresses');
    const priceArray = args.nextStringArray().expect('Failed to parse prices');

    // Check if the arrays have matching lengths
    if (symbolArray.length != addressArray.length || addressArray.length != priceArray.length) {
        throw new Error("Input arrays must have the same length");
    }

    // Update prices for each token
    for (let i = 0; i < symbolArray.length; i++) {
        const symbol = symbolArray[i];
        const address = addressArray[i];
        const price = priceArray[i];

        if (tokens.contains(symbol)) {
            const tokenData = tokens.getSome(symbol);
            tokenData.price = u256.fromBytes(stringToBytes(price));
            tokens.set(symbol, tokenData);

            // Generate an event instead of logging (serialize the TokenData as a string)
            generateEvent('TokenPriceUpdated' + 'Updated Price: Symbol: ' + symbol + ' Address: ' + address + ' New Price: ' + price);
        } else {
            // Generate an event for not found token (serialize the failure info as a string)
            generateEvent('TokenNotFound' + 'Token Not Found: Symbol: ' + symbol + ' Address: ' + address);
        }
    }
}

// Get price of token by symbol
export function getPriceBySymbol(binaryArgs: StaticArray<u8>): u256 {
    const args = new Args(binaryArgs);
    const symbol = args.nextString().expect("Failed to parse symbol");

    // Check if token exists before accessing it
    if (tokens.contains(symbol)) {
        const tokenData = tokens.getSome(symbol); // Safe to call after contains
        return tokenData.price;
    } else {
        generateEvent('TokenNotFound' + 'Token Not Found: Symbol: ' + symbol);
        throw new Error('Token with symbol ' + symbol + ' not found.');
    }
}

// Get price of token by address using the address index for quick lookup
export function getPriceByAddress(binaryArgs: StaticArray<u8>): StaticArray<u8> {
    const args = new Args(binaryArgs);
    const address = args.nextString().expect("Failed to parse address");

    // Check if the address exists in the index before accessing it
    if (addressIndex.contains(address)) {
        const symbol = addressIndex.getSome(address);
        const tokenData = tokens.getSome(symbol);
        return tokenData ? u256ToBytes(tokenData.price) : stringToBytes('Price not found for token with address ' + address);
    } else {
        generateEvent('TokenNotFound' + 'Token Not Found: Address: ' + address);
        throw new Error('Token with address ' + address + ' not found.');
    }
}
function onlyAdmin(): void {
    const admin = Storage.get(ADMIN_ADDRESS);
    assert(admin != null && bytesToString(admin) == Context.caller().toString(), "Unauthorized: Only admin can perform this action");
}
// Constructor function to initialize the oracle contract
export function constructor(binaryArgs: StaticArray<u8>): void {
    // In this case, we simulate the constructor as initializing the oracle contract by adding a sample token

    const initialSymbol = "USDT";
    const initialAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7";
    const initialPrice = u256.One; // Example price
    Storage.set(ADMIN_ADDRESS, stringToBytes(Context.caller().toString()));

    // Add new token data only if the token does not already exist
    if (!tokens.contains(initialSymbol)) {
        const tokenData = new TokenData(initialSymbol, initialAddress, initialPrice);
        tokens.set(initialSymbol, tokenData);
        addressIndex.set(initialAddress, initialSymbol);

        // Emit event for contract initialization
        generateEvent('OracleInitialized' + 'Oracle initialized with initial token: ' + initialSymbol);
    } else {
        generateEvent('TokenAlreadyExists' + 'Initial Token Already Exists: ' + initialSymbol);
    }
}
