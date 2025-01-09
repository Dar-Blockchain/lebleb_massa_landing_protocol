import * as dotenv from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { getEnvVariable } from './utils';
import { deploySC, WalletClient, ISCData } from '@massalabs/massa-sc-deployer';
import {
  Args,
  fromMAS,
  MAX_GAS_DEPLOYMENT,
  CHAIN_ID,
} from '@massalabs/massa-web3';

// Obtain the current file name and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

// Load .env file content into process.env
dotenv.config();

// Get environment variables
const publicApi = getEnvVariable('JSON_RPC_URL_PUBLIC');
const secretKey = getEnvVariable('WALLET_SECRET_KEY');
// Define deployment parameters
const chainId = CHAIN_ID.BuildNet; // Choose the chain ID corresponding to the network you want to deploy to
const maxGas = MAX_GAS_DEPLOYMENT; // Gas for deployment Default is the maximum gas allowed for deployment
const fees = 10_000_000n; // Fees to be paid for deployment. Default is 0
const waitFirstEvent = true;

// Create an account using the private keyc
const deployerAccount = await WalletClient.getAccountFromSecretKey(secretKey);

/**
 * Deploy one or more smart contracts.
 *
 * @remarks
 * Multiple smart contracts can be deployed by adding more objects to the array.
 * In this example one contract located at 'build/main.wasm' is deployed with
 * 0.1 MASSA and an argument 'Test'.
 *
 * After all deployments, it terminates the process.
 */
(async () => {
  await deploySC(
    publicApi, // JSON RPC URL
    deployerAccount, // account deploying the smart contract(s)
    [
      {
        data: readFileSync(path.join(__dirname, 'build', 'lending_pool.wasm')), // smart contract bytecode
        coins: fromMAS(0.1), // coins for deployment
        args: new Args()
        .addU256(75n)
        .addString("AS1FZXeCCDHma9Z5diHudCt9JZpiEB1sqXv9yiLFuEG94bAPZpjm")
        .addString("AU12pC6NqE91tL5aws3eoqssoNmHaSXvkgz1vuzjxiDirywW92BWM")
        , // arguments for deployment
      } as ISCData,
      // Additional smart contracts can be added here for deployment
    ],
    chainId,
    fees,
    maxGas,
    waitFirstEvent,
  );
  process.exit(0); // terminate the process after deployment(s)
})();


//Reserve AS1g9mDNwYgqUh3jEiDvL6CND9AJsxcYDeiBrZWGgWrWKsECzR1t
//LendingPool AS12eViAq8L9Js3HoFFWiZFAhZo3jp2QNmTJXBaLwiWQgdR3vZGdt