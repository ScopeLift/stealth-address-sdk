import {
  createWalletClient,
  http,
  publicActions,
  type WalletClient
} from 'viem';
import { generateKeysFromSignature } from '../../utils/helpers';
import { getRpcUrl } from '../../lib/helpers/test/setupTestEnv';
import setupTestWallet from '../../lib/helpers/test/setupTestWallet';
import { VALID_CHAINS } from '../../lib/helpers/types';
import { privateKeyToAccount } from 'viem/accounts';

// Default private key for testing; the setupTestWallet function uses the first anvil default key, so the below will be different
const ANVIL_DEFAULT_PRIVATE_KEY_2 =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

/* Gets the signature to be able to generate reproducible public/private viewing/spending keys */
export const getSignature = async ({
  walletClient
}: { walletClient: WalletClient }) => {
  if (!walletClient.chain) throw new Error('Chain not found');
  if (!walletClient.account) throw new Error('Account not found');

  const MESSAGE = `Signing message for stealth transaction on chain id: ${walletClient.chain.id}`;
  const signature = await walletClient.signMessage({
    message: MESSAGE,
    account: walletClient.account
  });

  return signature;
};

/* Generates the public/private viewing/spending keys from the signature */
export const getKeys = async ({
  walletClient
}: { walletClient: WalletClient }) => {
  const signature = await getSignature({ walletClient });
  const keys = generateKeysFromSignature(signature);
  return keys;
};

/* Sets up the sending and receiving wallet clients for testing */
export const getWalletClients = async () => {
  const sendingWalletClient = await setupTestWallet();
  if (!sendingWalletClient.account)
    throw new Error('Sending wallet client account not found');

  const chain = sendingWalletClient.chain;
  if (!chain) throw new Error('Chain not found');
  if (!(chain.id in VALID_CHAINS)) {
    throw new Error('Invalid chain');
  }

  const rpcUrl = getRpcUrl();

  const receivingWalletClient = createWalletClient({
    account: privateKeyToAccount(ANVIL_DEFAULT_PRIVATE_KEY_2),
    chain,
    transport: http(rpcUrl)
  }).extend(publicActions);

  return { sendingWalletClient, receivingWalletClient };
};

export const getAccount = (walletClient: WalletClient) => {
  if (!walletClient.account) throw new Error('Account not found');
  return walletClient.account;
};
