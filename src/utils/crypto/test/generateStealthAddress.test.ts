import { describe, test, expect } from 'bun:test';
import { bytesToHex } from 'viem';
import {
  generatePrivateKey,
  generateStealthAddress,
  getViewTag,
  parseKeysFromStealthMetaAddress,
} from '..';
import { VALID_SCHEME_ID, type HexString } from '../types';

describe('generateStealthAddress', () => {
  const validStealthMetaAddressURI =
    'st:eth:0x033404e82cd2a92321d51e13064ec13a0fb0192a9fdaaca1cfb47b37bd27ec13970390ad5eca026c05ab5cf4d620a2ac65241b11df004ddca360e954db1b26e3846e';

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;

  test('should generate a valid stealth address given a valid stealth meta-address URI', () => {
    // TODO compute the expected stealth address using computeStealthAddress (not yet implemented in the SDK)
    const result = generateStealthAddress({
      stealthMetaAddressURI: validStealthMetaAddressURI,
      schemeId,
    });

    expect(result.stealthAddress).toBeDefined();
  });

  test('should generate the same stealth address given the same ephemeralPrivateKey', () => {
    // First and second private keys are the same
    const firstPrivateKey = generatePrivateKey({ schemeId });
    const secondPrivateKey = generatePrivateKey({
      ephemeralPrivateKey: firstPrivateKey,
      schemeId,
    });

    const result = generateStealthAddress({
      stealthMetaAddressURI: validStealthMetaAddressURI,
      schemeId,
      ephemeralPrivateKey: firstPrivateKey,
    });

    const result2 = generateStealthAddress({
      stealthMetaAddressURI: validStealthMetaAddressURI,
      schemeId,
      ephemeralPrivateKey: secondPrivateKey,
    });

    expect(result.stealthAddress).toBe(result2.stealthAddress);
  });

  test('should correctly parse spending and viewing public keys from valid stealth meta-address', () => {
    const stealthMetaAddress = validStealthMetaAddressURI.slice(7) as HexString;
    const expectedSpendingPublicKeyHex =
      '0x033404e82cd2a92321d51e13064ec13a0fb0192a9fdaaca1cfb47b37bd27ec1397';
    const expectedViewingPublicKeyHex =
      '0x0390ad5eca026c05ab5cf4d620a2ac65241b11df004ddca360e954db1b26e3846e';

    const result = parseKeysFromStealthMetaAddress({
      stealthMetaAddress,
      schemeId,
    });

    expect(bytesToHex(result.spendingPublicKey)).toBe(
      expectedSpendingPublicKeyHex
    );
    expect(bytesToHex(result.viewingPublicKey)).toBe(
      expectedViewingPublicKeyHex
    );
  });

  test('should correctly extract the view tag from the hashed shared secret', () => {
    // Replace with the hashed shared secret from which you expect to extract the view tag
    const hashedSharedSecret =
      '0x158ce29a3dd0c8dca524e5776c2ba6361c280e013f87eee5eb799a713a939501';
    const expectedViewTag = '0x15';

    const result = getViewTag({
      hashedSharedSecret,
      schemeId,
    });

    expect(result).toBe(expectedViewTag);
  });
});
