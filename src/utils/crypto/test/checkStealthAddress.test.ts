import { describe, test, expect } from 'bun:test';
import {
  VALID_SCHEME_ID,
  checkStealthAddress,
  generateStealthAddress,
  parseKeysFromStealthMetaAddress,
  parseStealthMetaAddressURI
} from '..';
import { bytesToHex } from 'viem';

describe('checkStealthAddress', () => {
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const stealthMetaAddressURI =
    'st:eth:0x02f1f006a160b934c1d71479ce7d57f1c4ec10018230e35ca10ab65db68e8f037b0305d4725c7784262a38af11a9aef490b1307b82b17866f08d66c38db04c946ab1';
  const stealthMetaAddress = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId
  });
  const viewingPrivateKey =
    '0x2f8fcb2d1e06f52695e06a792b6d59c80a81ad70fc11b03b5236eed5cff09670';

  const { stealthAddress, ephemeralPublicKey, viewTag } =
    generateStealthAddress({
      stealthMetaAddressURI,
      schemeId
    });

  const { spendingPublicKey } = parseKeysFromStealthMetaAddress({
    stealthMetaAddress,
    schemeId
  });

  test('successfully identifies an announcement for the user', () => {
    const isForUser = checkStealthAddress({
      ephemeralPublicKey,
      schemeId,
      spendingPublicKey: bytesToHex(spendingPublicKey),
      userStealthAddress: stealthAddress,
      viewingPrivateKey,
      viewTag
    });

    expect(isForUser).toBe(true);
  });

  test('correctly rejects an announcement with a mismatched view tag', () => {
    const mismatchedViewTag = '0x123456'; // Some incorrect view tag
    const isForUser = checkStealthAddress({
      ephemeralPublicKey,
      schemeId,
      spendingPublicKey: bytesToHex(spendingPublicKey),
      userStealthAddress: stealthAddress,
      viewingPrivateKey,
      viewTag: mismatchedViewTag
    });

    expect(isForUser).toBe(false);
  });

  test('correctly rejects an announcement for a different stealth address', () => {
    const differentStealthAddress = '0xverynice'; // Some incorrect stealth address
    const isForUser = checkStealthAddress({
      ephemeralPublicKey,
      schemeId,
      spendingPublicKey: bytesToHex(spendingPublicKey),
      userStealthAddress: differentStealthAddress,
      viewingPrivateKey,
      viewTag
    });

    expect(isForUser).toBe(false);
  });
});
