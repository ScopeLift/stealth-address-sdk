import { getSharedSecret, CURVE } from '@noble/secp256k1';
import type { HexString, IComputeStealthKeyParams } from './types';
import {
  getHashedSharedSecret,
  handleSchemeId,
} from './generateStealthAddress';
import { hexToBytes } from 'viem';

function computeStealthKey({
  ephemeralPublicKey,
  schemeId,
  spendingPrivateKey,
  viewingPrivateKey,
}: IComputeStealthKeyParams): HexString {
  handleSchemeId(schemeId);

  const sharedSecret = getSharedSecret(
    hexToBytes(viewingPrivateKey),
    hexToBytes(ephemeralPublicKey)
  );

  const hashedSharedSecret = getHashedSharedSecret({ sharedSecret, schemeId });

  const spendingPrivateKeyBigInt = BigInt(spendingPrivateKey);
  const hashedSecretBigInt = BigInt(hashedSharedSecret);
  const curveOrderBigInt = BigInt(`0x${CURVE.n.toString(16)}`);

  // Compute the stealth private key by summing the spending private key and the hashed shared secret, then applying modulo with the curve's order.
  // This ensures the resulting key is within the elliptic curve's valid scalar range.
  const stealthPrivateKeyBigInt =
    (spendingPrivateKeyBigInt + hashedSecretBigInt) % curveOrderBigInt;

  const stealthPrivateKeyHex =
    `0x${stealthPrivateKeyBigInt.toString(16).padStart(64, '0')}` as HexString;

  return stealthPrivateKeyHex;
}

export default computeStealthKey;