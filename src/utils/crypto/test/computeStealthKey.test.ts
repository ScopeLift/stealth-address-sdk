import { describe, test, expect } from 'bun:test';
import {
  computeStealthKey,
  generatePrivateKey,
  generateStealthAddress,
  VALID_SCHEME_ID,
} from '..';
import { publicKeyToAddress } from 'viem/accounts';
import { getPublicKey, CURVE, ProjectivePoint, utils } from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from 'viem';
import { addPriv } from '../computeStealthKey';

describe('generateStealthAddress and computeStealthKey', () => {
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const stealthMetaAddressURI =
    'st:eth:0x033404e82cd2a92321d51e13064ec13a0fb0192a9fdaaca1cfb47b37bd27ec13970390ad5eca026c05ab5cf4d620a2ac65241b11df004ddca360e954db1b26e3846e';
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
      ephemeralPublicKey: generatedStealthAddressResult.ephemeralPublicKey,
      schemeId,
      spendingPrivateKey,
      viewingPrivateKey,
    });

    const computedStealthPublicKey = getPublicKey(
      hexToBytes(computedStealthPrivateKeyHex),
      false
    );

    const computedStealthAddress = publicKeyToAddress(
      bytesToHex(computedStealthPublicKey)
    );

    // Validate the generated stealth address matches the computed stealth address
    expect(generatedStealthAddressResult.stealthAddress).toEqual(
      computedStealthAddress
    );
  });
});

describe('adding private keys', () => {
  const privateKey1 = BigInt(
    '0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DEDFE92F46681B20A0'
  );
  const privateKey2 = BigInt(
    '0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DEDFE92F46681B20A0'
  );
  const curveOrder = BigInt(CURVE.n);

  test('demonstrate exceeding curve order results in invalid scalar, and modulo corrects it', () => {
    // Curve's order
    const curveOrder = BigInt(CURVE.n);

    // Create a scalar that exceeds the curve's order
    const exceededScalar = curveOrder + BigInt(1);
    // Format
    const _exceedScalar = `${exceededScalar.toString(16).padStart(64, '0')}`;

    // Check validity without modulo operation
    const isValidWithoutModulo = utils.isValidPrivateKey(_exceedScalar);
    expect(isValidWithoutModulo).toBe(false);

    // Apply modulo operation to bring the scalar within valid range
    const correctedScalar = exceededScalar % curveOrder;
    // Format
    const _correctedScalar = `${correctedScalar.toString(16).padStart(64, '0')}`;

    // Check validity with modulo operation
    const isValidWithModulo = utils.isValidPrivateKey(_correctedScalar);
    expect(isValidWithModulo).toBe(true);

    // Additionally, demonstrate that correctedScalar is less than curveOrder
    expect(correctedScalar).toBeLessThan(curveOrder);
  });

  test('adding private key scalars with addPriv', () => {
    const sumWithoutModulo = privateKey1 + privateKey2;
    // The sum exceeds the curve's order, which is invalid
    expect(sumWithoutModulo).toBeGreaterThan(curveOrder);

    const sumWithModulo = addPriv({
      a: privateKey1,
      b: privateKey2,
    });
    // The sum is within the curve's order, which is valid
    expect(sumWithModulo).toBeLessThanOrEqual(curveOrder);
  });
});
