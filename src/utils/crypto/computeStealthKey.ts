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
    viewingPrivateKey,
    ephemeralPublicKey
  ) as Hex;

  const hashedSharedSecret = getHashedSharedSecret({ sharedSecret, schemeId });

  const hashedSharedSecretPoint = ProjectivePoint.fromPrivateKey(
    hexToBytes(hashedSharedSecret)
  );

  // Compute the stealth private key
  const stealthPrivateKey = ProjectivePoint.fromHex(spendingPrivateKey)
    .add(hashedSharedSecretPoint)
    .toRawBytes();

  // Return the stealth private key as a hex string
  return bytesToHex(stealthPrivateKey);
}

export default computeStealthKey;
