import {
  createTestClient,
  createWalletClient,
  http,
  publicActions,
  walletActions,
} from 'viem';
import { getChain as _getChain } from '../chains';
import type { SuperWalletClient } from '../types';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainInfo, getRpcUrl } from './setupTestEnv';

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

  // Create a wallet client using the provided rpc url and private key (if provided, or defaults to creating a Viem test client).
  if (account) {
    return createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    }).extend(publicActions);
  }

  return createTestClient({
    mode: 'anvil',
    transport: http(rpcUrl),
  })
    .extend(publicActions)
    .extend(walletActions);
};

const getAccount = () => {
  // Retrieve the private key from the environment variables or default to a test private key.
  const privKey = (process.env.TEST_PRIVATE_KEY ||
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') as `0x${string}`;
  return privateKeyToAccount(privKey);
};

export default setupTestWallet;
