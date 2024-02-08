import { ProjectivePoint, getSharedSecret } from '@noble/secp256k1';
import type { Hex, HexString, IComputeStealthKeyParams } from './types';
import {
  getHashedSharedSecret,
  handleSchemeId,
} from './generateStealthAddress';
import { bytesToHex, hexToBytes } from 'viem';

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

  // Compute the stealth private key
  const stealthPrivateKey = `0x${BigInt(spendingPrivateKey) + BigInt(hashedSharedSecret)}`;

  // Return the stealth private key as a hex string
  return stealthPrivateKey as HexString;
}

export default computeStealthKey;
