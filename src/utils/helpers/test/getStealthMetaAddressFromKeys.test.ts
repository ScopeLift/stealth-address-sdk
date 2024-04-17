import { describe, expect, test } from 'bun:test';
import getStealthMetaAddressFromKeys from '../getStealthMetaAddressFromKeys';
import { VALID_SCHEME_ID, parseKeysFromStealthMetaAddress } from '../../crypto';
import { toHex } from 'viem';

const STEALTH_META_ADDRESS =
  '0x033404e82cd2a92321d51e13064ec13a0fb0192a9fdaaca1cfb47b37bd27ec13970390ad5eca026c05ab5cf4d620a2ac65241b11df004ddca360e954db1b26e3846e';

describe('getStealthMetaAddressFromKeys', () => {
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const {
    spendingPublicKey: _spendingPublicKey,
    viewingPublicKey: _viewingPublicKey
  } = parseKeysFromStealthMetaAddress({
    stealthMetaAddress: STEALTH_META_ADDRESS,
    schemeId
  });

  const spendingPublicKey = toHex(_spendingPublicKey);
  const viewingPublicKey = toHex(_viewingPublicKey);

  test('should return the correct stealth meta address', () => {
    const expected = STEALTH_META_ADDRESS;
    const actual = getStealthMetaAddressFromKeys({
      spendingPublicKey,
      viewingPublicKey
    });
    expect(actual).toBe(expected);
  });

  test('should throw an error if the spending public key is invalid', () => {
    // Invalid compressed public key
    const spendingPublicKey = '0x02a7';
    // Valid compressed public key
    const viewingPublicKey = '0x03b8';
    expect(() =>
      getStealthMetaAddressFromKeys({ spendingPublicKey, viewingPublicKey })
    ).toThrow('Invalid spending public key');
  });
});
