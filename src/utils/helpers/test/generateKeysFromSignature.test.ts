import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { signMessage } from 'viem/actions';
import setupTestWallet from '../../../lib/helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../../lib/helpers/types';
import type { HexString } from '../../crypto/types';
import generateKeysFromSignature from '../generateKeysFromSignature';
import isValidPublicKey from '../isValidPublicKey';

describe('generateKeysFromSignature', () => {
  let walletClient: SuperWalletClient;
  let signature: HexString;

  beforeAll(async () => {
    walletClient = await setupTestWallet();
    if (!walletClient.account) throw new Error('No account found');

    // Generate a signature to use in the tests
    signature = await signMessage(walletClient, {
      account: walletClient.account,
      message:
        'Sign this message to generate your stealth address keys.\nChain ID: 31337'
    });
  });

  afterAll(() => {
    mock.restore();
  });

  test('should generate valid public keys from a correct signature', () => {
    const result = generateKeysFromSignature(signature);

    expect(isValidPublicKey(result.spendingPublicKey)).toBe(true);
    expect(isValidPublicKey(result.viewingPublicKey)).toBe(true);
  });

  test('should throw an error for an invalid signature', () => {
    const invalidSignature = '0x123';

    expect(() => {
      generateKeysFromSignature(invalidSignature);
    }).toThrow('Invalid signature');
  });

  test('should throw an error for incorrectly parsed signatures', () => {
    const notMatchingSignature = '0x123';

    // Mock the output from extractPortions to return an signature that doesn't match the one passed in
    mock.module('../generateKeysFromSignature', () => ({
      extractPortions: () => notMatchingSignature
    }));

    expect(() => {
      generateKeysFromSignature(signature);
    }).toThrow('Signature incorrectly generated or parsed');
  });
});