import { beforeAll, describe, expect, test } from 'bun:test';
import { http, createWalletClient, parseEther, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getRpcUrl } from '../lib/helpers/test/setupTestEnv';
import {
  VALID_SCHEME_ID,
  computeStealthKey,
  generateStealthAddress
} from '../utils';
import { generateStealthMetaAddressFromSignature } from '../utils/helpers';
import { getAccount, getKeys, getSignature, getWalletClients } from './helpers';

/**
 * @description Tests for sending and receiving a payment
 * The tests need to be run using foundry because the tests utilize the default anvil private keys
 */

describe('Send and receive payment', () => {
  // Balance and send amount details
  const sendAmount = parseEther('1.0');
  // To account for gas fees
  const withdrawBuffer = parseEther('0.01');
  const withdrawAmount = sendAmount - withdrawBuffer;
  // Gas estimate for sending to the stealth address
  let gasEstimateSend: bigint;
  let sendingWalletBalanceChange: bigint;
  let receivingWalletBalanceChange: bigint;

  // Scheme ID for the stealth address interaction based on the ERC-5564 standard; the only valid scheme ID for stealth transactions is 1 currently
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;

  beforeAll(async () => {
    const { sendingWalletClient, receivingWalletClient } =
      await getWalletClients();

    const sendingAccount = getAccount(sendingWalletClient);
    const receivingAccount = getAccount(receivingWalletClient);

    // Key setup for the receiving wallet
    const receivingAccountKeys = await getKeys({
      walletClient: receivingWalletClient
    });

    // Stealth meta-address setup for the receiving wallet
    const receivingStealthMetaAddress = generateStealthMetaAddressFromSignature(
      await getSignature({ walletClient: receivingWalletClient })
    );

    // Generate a stealth address that the sending account will send to, and the receiving account will receive from
    // Uses the receiving stealth meta-address to generate the stealth address
    const { stealthAddress, ephemeralPublicKey } = generateStealthAddress({
      stealthMetaAddressURI: receivingStealthMetaAddress,
      schemeId
    });

    // Setup balance details
    const sendingWalletStartingBalance = await sendingWalletClient.getBalance({
      address: sendingAccount.address
    });
    const receivingWalletStartingBalance =
      await receivingWalletClient.getBalance({
        address: receivingWalletClient.account.address
      });

    // Send ETH to the stealth address
    const sendTxHash = await sendingWalletClient.sendTransaction({
      value: sendAmount,
      to: stealthAddress,
      account: sendingAccount,
      chain: sendingWalletClient.chain
    });

    const sendTxReceipt = await sendingWalletClient.getTransactionReceipt({
      hash: sendTxHash
    });
    const gasPriceSend = sendTxReceipt.effectiveGasPrice;
    gasEstimateSend = sendTxReceipt.gasUsed * gasPriceSend;

    // Wait for the transaction to be confirmed
    await sendingWalletClient.waitForTransactionReceipt({ hash: sendTxHash });

    // Compute the stealth key to be able to withdraw the funds from the stealth address to the receiving account
    const stealthAddressPrivateKey = computeStealthKey({
      schemeId,
      ephemeralPublicKey,
      spendingPrivateKey: receivingAccountKeys.spendingPrivateKey,
      viewingPrivateKey: receivingAccountKeys.viewingPrivateKey
    });

    // Setup a wallet client using the stealth address private key
    const stealthAddressWalletClient = createWalletClient({
      account: privateKeyToAccount(stealthAddressPrivateKey),
      chain: sendingWalletClient.chain,
      transport: http(getRpcUrl())
    }).extend(publicActions);

    // Withdraw from the stealth address to the receiving account
    const withdrawTxHash = await stealthAddressWalletClient.sendTransaction({
      account: stealthAddressWalletClient.account,
      chain: stealthAddressWalletClient.chain,
      to: receivingWalletClient.account.address,
      value: withdrawAmount
    });

    // Wait for the transaction to be confirmed
    await stealthAddressWalletClient.waitForTransactionReceipt({
      hash: withdrawTxHash
    });

    // Get the ending balances
    const sendingWalletEndingBalance = await sendingWalletClient.getBalance({
      address: sendingAccount.address
    });
    const receivingWalletEndingBalance = await receivingWalletClient.getBalance(
      { address: receivingAccount.address }
    );

    // Get the balance changes for the sending and receiving wallets
    sendingWalletBalanceChange =
      sendingWalletEndingBalance - sendingWalletStartingBalance;
    receivingWalletBalanceChange =
      receivingWalletEndingBalance - receivingWalletStartingBalance;
  });

  test('Can successfully send a stealth transaction from an account and withdraw from a different account by computing the stealth key', () => {
    expect(sendingWalletBalanceChange).toBe(-(sendAmount + gasEstimateSend));
    expect(receivingWalletBalanceChange).toBe(withdrawAmount);
  });
});
