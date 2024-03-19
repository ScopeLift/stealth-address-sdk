import { createWalletClient, http, publicActions } from 'viem';
import { getChain as _getChain } from '../chains';
import type { SuperWalletClient } from '../types';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainInfo, getRpcUrl } from './setupTestEnv';

const ANVIL_DEFAULT_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Initializes and configures a wallet client for testing purposes.
 * Defaults to local anvil node usage or, alternatively, set the PRIVATE_KEY environment variable to use a remote RPC URL.
 * @returns {SuperWalletClient} A configured wallet client.
 */
const setupTestWallet = (): SuperWalletClient => {
  // Retrieve the account from the private key set in environment variables if provided.
  const account = getAccount();
  const rpcUrl = getRpcUrl();
  const { chain } = getChainInfo();

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  }).extend(publicActions);
};

const getAccount = () => {
  // Retrieve the private key from the environment variables or default to the anvil test private key.
  const privKey = process.env.TEST_PRIVATE_KEY as `0x${string}` | undefined;
  return privateKeyToAccount(privKey ?? ANVIL_DEFAULT_PRIVATE_KEY);
};

export default setupTestWallet;
