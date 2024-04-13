import { createWalletClient, http, publicActions } from 'viem';
import { getChain as _getChain } from '../chains';
import type { SuperWalletClient } from '../types';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainInfo, getRpcUrl } from './setupTestEnv';
import { foundry } from 'viem/chains';

export const ANVIL_DEFAULT_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Initializes and configures a wallet client for testing purposes.
 * Defaults to local anvil node usage or, alternatively, set the PRIVATE_KEY environment variable to use a remote RPC URL.
 * @returns {SuperWalletClient} A configured wallet client.
 */
const setupTestWallet = async (): Promise<SuperWalletClient> => {
  const { chain, chainId } = await getChainInfo();
  // Retrieve the account from the private key set in environment variables if provided.
  const account = getAccount(chainId);
  const rpcUrl = getRpcUrl();

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  }).extend(publicActions);
};

const getAccount = (chainId: number) => {
  // If using foundry anvil, use the default private key
  if (chainId === foundry.id) {
    return privateKeyToAccount(ANVIL_DEFAULT_PRIVATE_KEY);
  }

  // Retrieve the private key from the environment variable
  const privKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;
  if (!privKey) {
    throw new Error(
      'Missing PRIVATE_KEY environment variable; make sure to set it when using a remote RPC URL.'
    );
  }
  return privateKeyToAccount(privKey);
};

export { setupTestWallet, getAccount };
export default setupTestWallet;
