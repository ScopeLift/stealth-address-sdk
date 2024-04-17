import { beforeAll, describe, expect, test } from 'bun:test';
import generatePublicKeysFromSignature from '../generateKeysFromSignature';
import setupTestWallet from '../../../lib/helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../../lib/helpers/types';
import type { HexString } from '../../crypto/types';
import { signMessage } from 'viem/actions';
import isValidPublicKey from '../isValidPublicKey';

describe('generatePublicKeysFromSignature', () => {
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

  test('should generate valid public keys from a correct signature', () => {
    const result = generatePublicKeysFromSignature(signature);

    expect(isValidPublicKey(result.spendingPublicKey)).toBe(true);
    expect(isValidPublicKey(result.viewingPublicKey)).toBe(true);
  });

  test('should throw an error for an invalid signature', () => {
    const invalidSignature = '0x123';

    expect(() => {
      generatePublicKeysFromSignature(invalidSignature);
    }).toThrow('Invalid signature');
  });

  test('should throw an error for incorrectly parsed signatures', () => {
    // Correct length but altered to introduce parsing errors
    const incorrectSignature: HexString = `0x${signature.slice(
      2,
      66
    )}${signature.slice(66, 130)}`;

    expect(() => {
      generatePublicKeysFromSignature(incorrectSignature);
    }).toThrow('Signature incorrectly generated or parsed');
  });
});
