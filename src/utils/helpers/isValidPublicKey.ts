import { ProjectivePoint } from '@noble/secp256k1';
import type { HexString } from '../crypto/types';

/**
 * Validates a hex string as a public key using the noble/secp256k1 library.
 * @param publicKey The public key to validate.
 * @returns True if the public key is valid, false otherwise.
 */

function isValidPublicKey(publicKey: HexString): boolean {
  try {
    ProjectivePoint.fromHex(publicKey.slice(2));
    return true;
  } catch {
    return false;
  }
}

export default isValidPublicKey;
