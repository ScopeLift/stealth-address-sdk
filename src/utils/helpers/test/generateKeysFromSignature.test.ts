import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { signMessage } from 'viem/actions';
import setupTestWallet from '../../../lib/helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../../lib/helpers/types';
import type { HexString } from '../../crypto/types';
import generateKeysFromSignature, {
  extractPortions
} from '../generateKeysFromSignature';
import isValidPublicKey from '../isValidPublicKey';

// Define the return type of extractPortions
type ExtractPortionsResult = {
  portion1: string;
  portion2: string;
  lastByte: string;
};

class DisposableMock {
  constructor(mockFn: () => void) {
    mockFn();
  }

  [Symbol.dispose]() {
    mock.restore();
  }
}

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

  afterEach(() => {
    mock.restore();
  });

  test('should generate valid public keys from a correct signature', () => {
    const result = generateKeysFromSignature(signature);

    expect(isValidPublicKey(result.spendingPublicKey)).toBe(true);
    expect(isValidPublicKey(result.viewingPublicKey)).toBe(true);
    expect(result.spendingPrivateKey).toBeDefined();
    expect(result.viewingPrivateKey).toBeDefined();
  });

  test('should throw an error for incorrectly parsed signatures', () => {
    const notMatchingSignature = '0x123';

    const mockExtractPortions = () => {
      return () => ({
        extractPortions: (): ExtractPortionsResult => ({
          portion1: notMatchingSignature,
          portion2: notMatchingSignature,
          lastByte: notMatchingSignature
        })
      });
    };

    using _mock = new DisposableMock(() => {
      mock.module('../generateKeysFromSignature', mockExtractPortions());
    });

    expect(() => {
      generateKeysFromSignature(signature);
    }).toThrow('Signature incorrectly generated or parsed');
  });

  describe('extractPortions', () => {
    test('should work correctly', () => {
      const signature = `0x${'a'.repeat(64)}${'b'.repeat(64)}cd` as HexString;
      const result = extractPortions(signature);

      expect(result.portion1).toBe('a'.repeat(64));
      expect(result.portion2).toBe('b'.repeat(64));
      expect(result.lastByte).toBe('cd');
    });
  });
});
