import { describe, test, expect } from 'bun:test';
import {
  computeStealthKey,
  generatePrivateKey,
  generateStealthAddress,
  VALID_SCHEME_ID,
} from '..';
import { getPublicKey } from 'noble-secp256k1';
import { publicKeyToAddress } from 'viem/utils';
import type { HexString } from '../types';

describe('generateStealthAddress and computeStealthKey', () => {
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const stealthMetaAddressURI =
    'st:eth:0x033404e82cd2a92321d51e13064ec13a0fb0192a9fdaaca1cfb47b37bd27ec13970390ad5eca026c05ab5cf4d620a2ac65241b11df004ddca360e954db1b26e3846e';
  const ephemeralPublicKey =
    '0x03fc725f1e2db3aadef6e90ff1f919c664e5034ab8c374bc0df743416b36cabf34';

  const spendingPrivateKey =
    '0x363721eb9e981558c748b824cb32a840da2b3e8957c2fc3bcb8d9c86cb87456';
  const viewingPrivateKey =
    '0xb52a0555f6a8663d89f00365893b1ef9e38eaf2e8bc48a63319c9ea5cb4a27c5';

  test('full cycle stealth address generation and validation', async () => {
    const ephemeralPrivateKey = generatePrivateKey({ schemeId });

    const generatedStealthAddressResult = generateStealthAddress({
      ephemeralPrivateKey,
      schemeId,
      stealthMetaAddressURI,
    });

    const computedStealthPrivateKeyHex = computeStealthKey({
      ephemeralPublicKey,
      schemeId,
      spendingPrivateKey,
      viewingPrivateKey,
    });

    const computedStealthPublicKey = getPublicKey(
      computedStealthPrivateKeyHex,
      true
    );

    const computedStealthAddress = publicKeyToAddress(
      computedStealthPublicKey as HexString
    );

    // Validate the generated stealth address matches the computed stealth address
    expect(generatedStealthAddressResult.stealthAddress).toEqual(
      computedStealthAddress
    );
  });
});
