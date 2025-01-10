# Security Analysis

The platform consists of two main smart contracts:

1. **Lending Pool Contract**
2. **Reserve Contract**

---

## **Critical Functions and Potential Issues**

### **1. Improper Reentrancy Guard Implementation**

**Issue**: The `inFunction` flag in the `borrow` function of the Reserve contract is not correctly managed.
//status resolved

**Code Snippet**:
//status to use a reetrancy guard
```typescript
export function borrow(binaryArgs: StaticArray<u8>): void {
    assert(!inFunction, "Reentrancy detected");
    inFunction = true;
    // Function logic...
    inFunction = true; // Should reset to false
}
```

**Explanation**:

- The `inFunction` flag is set to `true` at the beginning and end of the function without resetting it to `false`.
- This means the reentrancy guard is ineffective after the first call, leaving the function vulnerable to reentrancy attacks.
- Also the variable is not set in storage so it probably doesn't work at all

**Recommendation**:

- Use a ReentrancyGuard library. `ReentrancyGuard.__ReentrancyGuard_init()` must be called in the constructor, `ReentrancyGuard.nonReentrant()` at the beginning of a function & `ReentrancyGuard.endNonReentrant()` at the end:

  ```typescript
    import { Storage } from '@massalabs/massa-as-sdk';
    import { byteToU8, u8toByte } from '@massalabs/as-types';
    
    const STATUS = stringToBytes('status');

    /** ReentrancyGuardUpgradeable errors */

    const ReentrancyGuard__ReentrantCall = (): string =>
    'ReentrancyGuard__ReentrantCall';
    const ReentrancyGuard__AlreadyInitialized = (): string =>
    'ReentrancyGuard__AlreadyInitialized';

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    const _NOT_ENTERED: u8 = 1;
    const _ENTERED: u8 = 2;

    /// @title Reentrancy Guard
    /// @notice Contract module that helps prevent reentrant calls to a function
    export class ReentrancyGuard {
        static __ReentrancyGuard_init(): void {
            assert(
            !Storage.has(STATUS),
            ReentrancyGuard__AlreadyInitialized(),
            );

            Storage.set(STATUS, u8toByte(_NOT_ENTERED));
        }

        /// @notice Prevents a contract from calling itself, directly or indirectly.
        /// Calling a `nonReentrant` function from another `nonReentrant`
        /// function is not supported. It is possible to prevent this from happening
        /// by making the `nonReentrant` function external, and making it call a
        /// `private` function that does the actual work
        static nonReentrant(): void {
            // On the first call to nonReentrant, _notEntered will be true

            assert(
            byteToU8(Storage.get(STATUS)) == _NOT_ENTERED,
            ReentrancyGuard__ReentrantCall(),
            );

            // Any calls to nonReentrant after this point will fail
            Storage.set(STATUS, u8toByte(_ENTERED));
        }

        static endNonReentrant(): void {
            Storage.set(STATUS, u8toByte(_NOT_ENTERED));
        }
    }
  ```
//status resolved
### **2. Missing `getUserCollateralAmount` Function in Reserve Contract**

- **Issue:**
  - The Lending Pool's `calculateTotalCollateralValue` function relies on `reserve.getUserCollateralAmount(userAddress)`, which is not implemented in the Reserve contract.
- **Risk:**
  - **Collateral Miscalculations:** The system cannot accurately calculate a user's total collateral, potentially allowing over-borrowing.
  - **Bypassing Collateral Checks:** Users might borrow without sufficient collateral, risking reserve funds.

- **Recommendation:**
  - Implement the `getUserCollateralAmount` function in the Reserve contract to return the user's collateral balance.
  - Ensure consistency between contracts regarding user data and available functions.

### **3. Incorrect Collateral Handling in Borrow Function**
//status solved
**Issue**: The `borrow` function in the Reserve contract incorrectly reduces the user's collateral balance when borrowing.

**Code Snippet**:

```typescript
// Lock the collateral in the reserve
let newCollateralUserBalance = u256.sub(collateralUserBalance, amount);
userBalances.set(borrower, newCollateralUserBalance);
```

**Explanation**:

- Reducing the user's collateral balance upon borrowing is not standard practice.
- Collateral should remain locked and unchanged unless explicitly withdrawn.

**Risk**:

- Users could end up undercollateralized, leading to potential loss of funds for the protocol.

**Recommendation**:

- Do not alter the user's collateral balance when they borrow.
- Ensure that collateral remains locked until the user repays their debt and withdraws.

### **4. Mismatched Function Arguments Between Contracts**
//status solved
**Issue**: Inconsistent function signatures between the Lending Pool and Reserve contracts can lead to incorrect behavior.

**Code Snippet (Lending Pool borrow call)**:

```typescript
call(new Address(borrowReserveAddress), "borrow", new Args().add(amount).add(userAddress), 4_000_000);
```

**Reserve Contract borrow function expects**:

```typescript
const amount = args.nextU256().expect("Expected the borrow amount");
const borrower = args.nextString().expect("Expected the borrower address");
const collateralAsset = args.nextString().expect("Expected collateral asset");
```

**Explanation**:

- The Reserve's `borrow` function expects three arguments, but only two are provided.
- This mismatch can cause the function to read incorrect values, leading to unexpected behavior.

**Recommendation**:

- Ensure that the arguments passed in function calls match the expected parameters.
- Update the function calls or function definitions to be consistent.

### **5. Improper Interest and Reward Calculations**
// status resolved
- **Issue:**
  - Interest and rewards are calculated but not properly updated in user debts (`userBorrows`) or reward balances (`userRewards`).
  - In `repay`, the interest is calculated but not added to `userBorrows` before updating the debt.
- **Risk:**
  - **Interest Evasion:** Users may repay only the principal without the accrued interest.
  - **Reward Inconsistencies:** Users might not receive the correct reward amounts, leading to trust issues or financial discrepancies.

- **Recommendation:**
  - Accurately update `userBorrows` with the accrued interest before allowing repayments.
  - Ensure that rewards are correctly calculated, stored, and accessible to users.
  - Provide functions for users to claim their rewards.

### **6. Division by Zero in Rate Calculations**
// solved
- **Issue:**
  - In `calculateRates`, if `totalAssets` is zero, a division by zero occurs when calculating utilization.
- **Risk:**
  - **Contract Crash:** Division by zero can cause the function to fail, potentially halting contract operations.
  - **Manipulation of Rates:** Attackers might intentionally set `totalAssets` to zero to affect rate calculations.

- **Recommendation:**
  - Add checks to prevent division by zero by ensuring `totalAssets` is greater than zero before performing divisions.
  - Define default behaviors or rates when `totalAssets` is zero.

### **7. Manipulation of Price Oracle**
// create an oracle contract that will be configured with an offchain bot when the lending protocol will be on prod 
**Description**: The price of an asset is taken directly on the spot price of Dusa in `_getTokenPrice`. 
Also the price is calculated with `ONE_UNIT = 10 ** 9` but the token may not have 9 decimals (ex usdc has 6, weth 18,...).

The price should be used in some func2tion while calculating the amount possible to borrow but the borrow logic isn't finished.

**Impact**: Non-fonctionning smart contract
// not used i will delete it 
**Evidence from Code**:
```typescript
export function _getTokenPrice(tokenA: Address, tokenB: Address): f64 {
    const binStep: u64 = 100; // The step size for the liquidity bin
    const router = new IRouter(ROUTER); // Initialize the router interface
    const factory = new IFactory(FACTORY); // Initialize the factory interface

    // Fetch the pair information from the factory
    const pairInfo = factory.getLBPairInformation(tokenA, tokenB, binStep);
    const pair = pairInfo.pair; // The liquidity pair contract

    // Determine which token is represented as tokenY in the liquidity pool
    const tokenAIsTokenY = pair.getTokenY()._origin == tokenA;

    // Fetch the swap output for a small amount (1 unit) to calculate the price
    const swapOut = router.getSwapOut(pair, u256.fromU64(1 * ONE_UNIT), !tokenAIsTokenY);
    let amountOutu64=bytesToU64(u256ToBytes(swapOut.amountOut))
    // Calculate the price by dividing the amount out by one unit
    return f64(amountOutu64) / f64(ONE_UNIT);
}
```

**Recommendation**: 

- Use Umbrella network's off-chain oracle

- Use Dusa's on-chain oracle
// it not based only by the time is based on dynamic formula putted on the whitepaper (is not a security vulnerability)
### **8. Inadequate Handling of User Rewards and Interest**

**Issue**: The reward and interest calculations may lead to inaccurate accruals over time.

**Explanation**:

- Rewards and interests are calculated based on time differences.
- If a user does not interact for a long time, rewards or interest may accumulate indefinitely.

**Recommendation**:

- Implement mechanisms to cap rewards and interests over extended periods.
- Consider using a more dynamic model that adjusts rates based on user activity.

### **9. Incorrect Implementation of Reward Distribution**
//solved by adding claimrewards function

- **Issue:**
  - The `calculateAndStoreRewards` function in the Reserve contract does not return any value, but the Lending Pool's `getRewardsForAsset` function expects a return value.
- **Risk:**
  - **Reward Claim Failures:** Users will not receive their rewards as the system cannot retrieve the calculated reward amounts.
  - **User Dissatisfaction:** Lack of rewards can lead to loss of trust and platform abandonment.

- **Recommendation:**
  - Modify `calculateAndStoreRewards` to return the calculated rewards.
  - Ensure that the Lending Pool correctly handles the returned value and mints the appropriate amount of aTokens as rewards.

// is a minor prob
### **10. Usage of `u256.toString()`**

**Description**: `u256.toString()` is not optimised at all and is gas exhausting. 42 usage of it would be enough to use all the gas of a block.

**Impact**: Error out of gas once multiple operation are done.

**Recommendation**:

- Convert the u256 to bytes:
  ```typescript
  /**
   * @notice Function to convert a u256 to a UTF-16 bytes then to a string
   * @dev u256.toString() is too expensive in as-bignum so we use this instead
   */
   export function u256ToString(u: u256): string {
     return String.UTF16.decode(changetype<ArrayBuffer>(u));
   }
   ```

It can be decoded later (on the frontend/sdk) with:
```typescript
    static decodeU256 = (bytes: string): bigint =>
        bytesToU256(strEncodeUTF16(bytes))
    
    const strEncodeUTF16 = (str: string): Uint8Array => {
        const buf = new ArrayBuffer(str.length * 2)
        const bufView = new Uint16Array(buf)
            for (let i = 0, strLen = str.length; i < strLen; i++) {
                bufView[i] = str.charCodeAt(i)
            }
        return new Uint8Array(buf)
    }
```

### **10. Missing liquidation process** 

**Description**: The liquidation part was not finished when doing the review.

**Impact**: Non-fonctionning smart contract

**Recommendation**: 

- Finishing [collateral.ts](https://github.com/Dar-Blockchain/massa_landing_borrowing/blob/Develop/assembly/contracts/collateral.ts) and especially the `liquidate` function which should be on export.

---

## **Conclusion**

The provided code for the lending and borrowing platform contains several critical issues that could lead to vulnerabilities, including reentrancy attacks, unauthorized access, incorrect collateral handling, and precision errors in calculations. It is essential to address these issues to ensure the security and reliability of the platform. Implementing the recommendations above will significantly enhance the platform's resilience against potential hacks or loss of funds.