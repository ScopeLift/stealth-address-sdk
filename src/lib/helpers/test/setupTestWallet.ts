import { createWalletClient, http, publicActions } from 'viem';
import { getChain as _getChain } from '../chains';
import type { SuperWalletClient } from '../types';
import { privateKeyToAccount } from 'viem/accounts';
import { getRpcUrl, getValidChainId } from './setupTestEnv';

/**
 * Initializes and configures a wallet client for testing purposes.
 * @param {boolean} useLocal - Flag to determine if a local or remote RPC URL should be used.
 * To use a local RPC URL, set the TEST_LOCAL_NODE_RPC_URL environment variable and use (for example)
 * anvil to fork your rpc url. To use a remote RPC URL, set the TEST_RPC_URL environment variable and set useLocal to false.
 * @returns {SuperWalletClient} A configured wallet client.
 */
const setupTestWallet = (useLocal: boolean = true): SuperWalletClient => {
  // Retrieve the account from the private key set in environment variables.
  const account = getAccount();
  // Determine the RPC URL based on whether local or remote env is used.
  const rpcUrl = getRpcUrl(useLocal);
  // Obtain the viem chain information
  const chain = getChain();

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  if (!walletClient) {
    throw new Error('Could not create wallet client for testing.');
  }

  return walletClient.extend(publicActions);
};

const getChain = () => {
  const chainIdEnv = process.env.TEST_CHAIN_ID as string | undefined;
  if (!chainIdEnv) {
    throw new Error('TEST_CHAIN_ID is not defined');
  }
  const chainId = getValidChainId(Number(chainIdEnv));
  return _getChain(chainId);
};

const getAccount = () => {
  const privKey = process.env.TEST_PRIVATE_KEY as `0x${string} ` | undefined;
  if (!privKey) {
    throw new Error('TEST_PRIVATE_KEY is not defined');
  }

  return privateKeyToAccount(privKey);
};

export default setupTestWallet;
