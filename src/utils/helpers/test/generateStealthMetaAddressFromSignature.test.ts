import { beforeAll, describe, expect, test } from 'bun:test';
import { signMessage } from 'viem/actions';
import setupTestWallet from '../../../lib/helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../../lib/helpers/types';
import { VALID_SCHEME_ID, parseKeysFromStealthMetaAddress } from '../../crypto';
import type { HexString } from '../../crypto/types';
import { extractPortions } from '../generateKeysFromSignature';
import generateStealthMetaAddressFromSignature from '../generateStealthMetaAddressFromSignature';

describe('generateStealthMetaAddressFromSignature', () => {
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

  test('should generate a stealth meta-address from a signature', () => {
    const result = generateStealthMetaAddressFromSignature(signature);

    expect(result).toBeTruthy();

    // Can parse the keys from the stealth meta-address
    expect(() =>
      parseKeysFromStealthMetaAddress({
        stealthMetaAddress: result,
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1
      })
    ).not.toThrow();
  });

  describe('extractPortions', () => {
    test('should extract distinct portions from a signature', () => {
      const signature = `0x${'a'.repeat(64)}${'b'.repeat(
        64
      )}cd` satisfies `0x${string}`;

      const { portion1, portion2, lastByte } = extractPortions(signature);

      expect(portion1).toBe('a'.repeat(64));
      expect(portion2).toBe('b'.repeat(64));
      expect(lastByte).toBe('cd');
    });
  });
});
