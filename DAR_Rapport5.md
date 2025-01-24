# Review of Lending borrowing SC

## 1. Oracle Vulnerabilities (critical)
// solved
The most critical vulnerability is the lack of access control on the oracle functions (`addToken`, `updatePrices`) in `oracle.ts`. Currently, any user can manipulate token prices, leading to several risks:
- **Price Inflation**: Malicious users can artificially inflate token prices to borrow more than they should, walking away with real assets while leaving behind worthless collateral.
- **Price Deflation**: Attackers can deflate token prices to trigger forced liquidations of undercollateralized users.
- **Reward Manipulation**: By inflating the price of a token, attackers can farm disproportionate rewards over time by appearing as large liquidity providers.

### Recommendation:
- Best: Use Umbrella network's off-chain oracle

- Use Dusa's on-chain oracle

- Or implement a proper oracle yourself but this comes with a lot of risks.

## 2. Missing Withdraw Function (critical)
//solved
There is no function allowing users to withdraw collateral. Once a user deposits, the funds are effectively locked in the system, and the only attempt to “unlock” them happens when debt is fully repaid—but even then, there is no actual token transfer back to the user.

### Recommendation
Add a proper withdraw (or redeem) function that:
- Checks that a user’s outstanding debt is zero (or remains sufficiently collateralized).
- Subtracts the withdrawn amount from the user’s internal balance.
- Transfers the corresponding tokens from the contract back to the user’s address.

## 3. Admin Key Security (critical)
// this point will be solved after launch , we will add a dao that manage the protocol
A single EOA (Externally Owned Address) is a risk.

Although certain protocol functions (like the `onlyAdmin()` checks in the lending pool) require admin privileges, the repository does not outline how the admin key is stored or managed. If the admin key can make system-critical changes (such as updating parameters, reserves, or oracles), it becomes a single point of failure.

A compromised admin key can update addresses or parameters, drain funds, manipulate interest rates, or shut down the protocol.

### Recommendation:

- Use a multi-sig (e.g., 2-of-3 or 3-of-5) so that no single party can unilaterally control upgrades or changes.
- Implement time-delay changes for highly sensitive actions (like upgrading the contract or changing key parameters), giving users time to exit if a malicious update is proposed.
- Audit all admin-only code paths to ensure no backdoor logic can drain the protocol.

## 4. Floating-Point Arithmetic Issues (high)
// changed from old version , i use u256 for all arethmetic operation
The code uses floating-point (f64) for price calculations and some other financial metrics. This can lead to precision loss, especially for large token amounts or small decimals. Attackers could exploit rounding errors to:
- Slightly overborrow or undercollateralize.
- Manipulate the liquidation or interest calculations.

Any reliance on floating-point arithmetic in financial logic can create edge cases if users deposit huge amounts or if tokens have 18+ decimals.

### Recommendation:
Replace floating-point arithmetic with integer-based (fixed-point) calculations to ensure precision. Define a scaling factor (e.g., `SCALE = 1e18`) and represent all fractional numbers as integers scaled by this factor. Perform all calculations using integer arithmetic to maintain precision and determinism.

```typescript
// Example of handling price as an integer with 1e8 scaling
const scaledPrice = u256.from(1_000_000_000); // 1e8
// price = 1.2345 => store it as 123450000 (u256)
```

## 5. Arithmetic Overflow and Underflow Risks (High)
//solved
The contracts performs arithmetic operations without checks for overflows or underflows, which can lead to incorrect calculations.
Overflows or underflows may result in users owing negative debts or having inflated balances.

### Exemple:

If amount repay is greater than userBorrowed and smaller than totalDue.
```typescript
    const totalDue = u256.add(userBorrowed, interest);

    assert(amount <= totalDue, "Repay amount exceeds borrowed amount");

    const newUserBorrowed = u256.sub(userBorrowed, amount);
```

### Recommendation:

- Utilize safeMath libraries (https://github.com/massalabs/as/blob/main/packages/as-types/assembly/safeMath.ts) or implement checks to prevent overflows and underflows.

## 6. Interest & Reward Timing Attacks (medium)
// this problem will be fixed on the next versions 
Both interest and rewards are calculated in a "pull-based" manner—updated only when a user interacts with the contract (e.g., borrow, repay, deposit). This design can be exploited:
- **Timing Manipulation**: Users could strategically time their interactions (e.g., borrow and repay quickly) to minimize interest, or deposit and wait a long time before claiming rewards to maximize them.

### Recommendation:
Consider a more frequent or automated update mechanism to prevent timing-based exploits.

A partial mitigation can be done by bounding how quickly a user can repay after borrowing (e.g. a minimum time lock), or by introducing a “fixed rate for minimum periods.”

Or, the protocol can store interest each block/every few blocks with an on-chain scheduling mechanism.

## 7. Unused or Commented Code (low)
//solved
Some code files contain unused or commented-out code and unfinished interfaces, especially in files like `collateral.ts` and `ILendingPool.ts`. This increases the complexity of the contract and may hide issues that can lead to future vulnerabilities.

### Recommendation:
Clean up unused or commented-out code. Ensure that all code is reviewed and finalized to avoid leaving dead code that could introduce hidden bugs.

## 8. Usage of `u256.toString()` (low)
// let this like improvment to the next version
The usage of `u256.toString()` is gas-expensive and can cause out-of-gas errors after multiple operations. This is especially problematic when used repeatedly, as it can exhaust the gas limit for a block.

Frequent event logging with large numbers is too expensive (~100 000 000 gas per u256.toString, max gas is ~4 200 000 000).

### Recommendation:
Avoid using `u256.toString()` for frequent operations. Instead, convert the `u256` to bytes and decode it to a string in a more gas-efficient manner using a helper function.

```typescript
/**
 * @notice Function to convert a u256 to a UTF-16 bytes then to a string
 * @dev u256.toString() is too expensive in as-bignum so we use this instead
 */
export function u256ToString(u: u256): string {
  return String.UTF16.decode(changetype<ArrayBuffer>(u));
}
```
