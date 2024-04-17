import type { HexString } from '../crypto/types';
import generateKeysFromSignature from './generateKeysFromSignature';
import getStealthMetaAddressFromKeys from './getStealthMetaAddressFromKeys';

/**
 * Generates a stealth meta-address from a signature by:
 *  1. Generating the spending and viewing public keys from the signature.
 *  2. Concatenating the public keys from step 1.
 * @param signature as a hexadecimal string.
 * @returns The stealth meta-address as a hexadecimal string.
 */
function getStealthMetaAddressFromSignature(signature: HexString): HexString {
  const { spendingPublicKey, viewingPublicKey } =
    generateKeysFromSignature(signature);

  const stealthMetaAddress = getStealthMetaAddressFromKeys({
    spendingPublicKey,
    viewingPublicKey
  });

  return stealthMetaAddress;
}

export default getStealthMetaAddressFromSignature;
