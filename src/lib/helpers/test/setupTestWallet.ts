import { createWalletClient, http, publicActions } from 'viem';
import { getChain } from '../chains';
import type { SuperWalletClient } from '../types';
import { privateKeyToAccount } from 'viem/accounts';
import { getValidChainId } from './setupTestEnv';

const setupTestWallet = (): SuperWalletClient => {
  const chainIdEnv = process.env.TEST_CHAIN_ID;
  if (!chainIdEnv) {
    throw new Error('TEST_CHAIN_ID is not defined');
  }
  const chainId = getValidChainId(Number(chainIdEnv));

  const privKey = process.env.TEST_PRIVATE_KEY;
  if (!privKey) {
    throw new Error('TEST_PRIVATE_KEY is not defined');
  }

  const account = privateKeyToAccount(
    process.env.TEST_PRIVATE_KEY as `0x${string}`
  );

  const rpcUrl = process.env.TEST_RPC_URL;
  if (!rpcUrl) {
    throw new Error('TEST_RPC_URL is not defined');
  }

  const chain = getChain(chainId);
  if (!chain) {
    new Error('Chain not found');
  }

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

export default setupTestWallet;
