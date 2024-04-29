import {
  http,
  type Address,
  type Client,
  type WalletClient,
  createWalletClient,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getRpcUrl } from "../../lib/helpers/test/setupTestEnv";
import setupTestWallet from "../../lib/helpers/test/setupTestWallet";
import { type SuperWalletClient, VALID_CHAINS } from "../../lib/helpers/types";
import { generateKeysFromSignature } from "../../utils/helpers";

// Default private key for testing; the setupTestWallet function uses the first anvil default key, so the below will be different
const ANVIL_DEFAULT_PRIVATE_KEY_2 =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

/* Gets the signature to be able to generate reproducible public/private viewing/spending keys */
export const getSignature = async ({
  walletClient,
}: {
  walletClient: WalletClient;
}) => {
  if (!walletClient.chain) throw new Error("Chain not found");
  if (!walletClient.account) throw new Error("Account not found");

  const MESSAGE = `Signing message for stealth transaction on chain id: ${walletClient.chain.id}`;
  const signature = await walletClient.signMessage({
    message: MESSAGE,
    account: walletClient.account,
  });

  return signature;
};

/* Generates the public/private viewing/spending keys from the signature */
export const getKeys = async ({
  walletClient,
}: {
  walletClient: WalletClient;
}) => {
  const signature = await getSignature({ walletClient });
  const keys = generateKeysFromSignature(signature);
  return keys;
};

/* Sets up the sending and receiving wallet clients for testing */
export const getWalletClients = async () => {
  const sendingWalletClient = await setupTestWallet();

  const chain = sendingWalletClient.chain;
  if (!chain) throw new Error("Chain not found");
  if (!(chain.id in VALID_CHAINS)) {
    throw new Error("Invalid chain");
  }

  const rpcUrl = getRpcUrl();

  const receivingWalletClient: SuperWalletClient = createWalletClient({
    account: privateKeyToAccount(ANVIL_DEFAULT_PRIVATE_KEY_2),
    chain,
    transport: http(rpcUrl),
  }).extend(publicActions);

  return { sendingWalletClient, receivingWalletClient };
};

export const getAccount = (walletClient: WalletClient | Client) => {
  if (!walletClient.account) throw new Error("Account not found");
  return walletClient.account;
};

/* Gets the wallet clients, accounts, and keys for the sending and receiving wallets */
export const getWalletClientsAndKeys = async () => {
  const { sendingWalletClient, receivingWalletClient } =
    await getWalletClients();

  const sendingAccount = getAccount(sendingWalletClient);
  const receivingAccount = getAccount(receivingWalletClient);

  const receivingAccountKeys = await getKeys({
    walletClient: receivingWalletClient,
  });

  return {
    sendingWalletClient,
    receivingWalletClient,
    sendingAccount,
    receivingAccount,
    receivingAccountKeys,
  };
};

/* Set up the initial balance details for the sending and receiving wallets */
export const setupInitialBalances = async ({
  sendingWalletClient,
  receivingWalletClient,
}: {
  sendingWalletClient: SuperWalletClient;
  receivingWalletClient: SuperWalletClient;
}) => {
  const sendingAccount = getAccount(sendingWalletClient);
  const receivingAccount = getAccount(receivingWalletClient);
  const sendingWalletStartingBalance = await sendingWalletClient.getBalance({
    address: sendingAccount.address,
  });
  const receivingWalletStartingBalance = await receivingWalletClient.getBalance(
    {
      address: receivingAccount.address,
    }
  );

  return {
    sendingWalletStartingBalance,
    receivingWalletStartingBalance,
  };
};

/* Send ETH and wait for the transaction to be confirmed */
export const sendEth = async ({
  sendingWalletClient,
  to,
  value,
}: {
  sendingWalletClient: SuperWalletClient;
  to: Address;
  value: bigint;
}) => {
  const account = getAccount(sendingWalletClient);
  const hash = await sendingWalletClient.sendTransaction({
    value,
    to,
    account,
    chain: sendingWalletClient.chain,
  });

  const receipt = await sendingWalletClient.waitForTransactionReceipt({ hash });

  const gasPriceSend = receipt.effectiveGasPrice;
  const gasEstimate = receipt.gasUsed * gasPriceSend;

  return { hash, gasEstimate };
};

/* Get the ending balances for the sending and receiving wallets */
export const getEndingBalances = async ({
  sendingWalletClient,
  receivingWalletClient,
}: {
  sendingWalletClient: SuperWalletClient;
  receivingWalletClient: SuperWalletClient;
}) => {
  const sendingAccount = getAccount(sendingWalletClient);
  const receivingAccount = getAccount(receivingWalletClient);
  const sendingWalletEndingBalance = await sendingWalletClient.getBalance({
    address: sendingAccount.address,
  });
  const receivingWalletEndingBalance = await receivingWalletClient.getBalance({
    address: receivingAccount.address,
  });

  return {
    sendingWalletEndingBalance,
    receivingWalletEndingBalance,
  };
};
