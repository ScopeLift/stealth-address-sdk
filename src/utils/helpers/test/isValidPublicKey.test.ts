import { describe, expect, test } from 'bun:test';
import { toHex } from 'viem';
import { VALID_SCHEME_ID, parseKeysFromStealthMetaAddress } from '../../crypto';
import isValidPublicKey from '../isValidPublicKey';

describe('isValidPublicKey', () => {
  const VALID_STEALTH_META_ADDRESS =
    '0x033404e82cd2a92321d51e13064ec13a0fb0192a9fdaaca1cfb47b37bd27ec13970390ad5eca026c05ab5cf4d620a2ac65241b11df004ddca360e954db1b26e3846e';
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;

  const {
    spendingPublicKey: _spendingPublicKey,
    viewingPublicKey: _viewingPublicKey
  } = parseKeysFromStealthMetaAddress({
    stealthMetaAddress: VALID_STEALTH_META_ADDRESS,
    schemeId
  });

  const spendingPublicKey = toHex(_spendingPublicKey);

  test('should return true for a valid public key', () => {
    expect(isValidPublicKey(spendingPublicKey)).toBe(true);
  });

  test('should return false for an invalid public key', () => {
    // Invalid public key
    const invalidPublicKey = '0x02a7';
    expect(isValidPublicKey(invalidPublicKey)).toBe(false);
  });
});
