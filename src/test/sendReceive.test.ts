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
import {
  getEndingBalances,
  getSignature,
  getWalletClientsAndKeys,
  sendEth,
  setupInitialBalances
} from './helpers';

/**
 * @description Tests for sending and receiving a payment
 * Sending means generating a stealth address using the sdk, then sending funds to that stealth address; the sending account is the account that sends the funds
 * Withdrawing means computing the stealth address private key using the sdk, then withdrawing funds from the stealth address; the receiving account is the account that receives the funds
 *
 * The tests need to be run using foundry because the tests utilize the default anvil private keys
 */

describe('Send and receive payment', () => {
  const sendAmount = parseEther('1.0');
  const withdrawBuffer = parseEther('0.01');
  const withdrawAmount = sendAmount - withdrawBuffer;
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;

  let gasEstimateSend: bigint;
  let sendingWalletBalanceChange: bigint;
  let receivingWalletBalanceChange: bigint;

  beforeAll(async () => {
    const {
      receivingAccount,
      receivingAccountKeys,
      receivingWalletClient,
      sendingWalletClient
    } = await getWalletClientsAndKeys();

    const { stealthAddress, ephemeralPublicKey } = generateStealthAddress({
      stealthMetaAddressURI: generateStealthMetaAddressFromSignature(
        await getSignature({ walletClient: receivingWalletClient })
      ),
      schemeId
    });

    const { sendingWalletStartingBalance, receivingWalletStartingBalance } =
      await setupInitialBalances({
        receivingWalletClient,
        sendingWalletClient
      });

    // Send ETH to the stealth address
    const { gasEstimate } = await sendEth({
      sendingWalletClient,
      to: stealthAddress,
      value: sendAmount
    });

    gasEstimateSend = gasEstimate;

    // Compute the stealth key to be able to withdraw the funds from the stealth address to the receiving account
    const stealthAddressPrivateKey = computeStealthKey({
      schemeId,
      ephemeralPublicKey,
      spendingPrivateKey: receivingAccountKeys.spendingPrivateKey,
      viewingPrivateKey: receivingAccountKeys.viewingPrivateKey
    });

    // Set up a wallet client using the stealth address private key
    const stealthAddressWalletClient = createWalletClient({
      account: privateKeyToAccount(stealthAddressPrivateKey),
      chain: sendingWalletClient.chain,
      transport: http(getRpcUrl())
    }).extend(publicActions);

    // Withdraw from the stealth address to the receiving account
    await sendEth({
      sendingWalletClient: stealthAddressWalletClient,
      to: receivingAccount.address,
      value: withdrawAmount
    });

    const { sendingWalletEndingBalance, receivingWalletEndingBalance } =
      await getEndingBalances({
        sendingWalletClient,
        receivingWalletClient
      });

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
