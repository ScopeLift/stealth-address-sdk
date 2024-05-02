import type { HexString } from '../crypto/types';
import isValidPublicKey from './isValidPublicKey';

/**
 * Concatenates the spending and viewing public keys to create a stealth meta address.
 * @param spendingPublicKey
 * @param viewingPublicKey
 * @returns The stealth meta address as a hexadecimal string.
 */
function generateStealthMetaAddressFromKeys({
  spendingPublicKey,
  viewingPublicKey
}: {
  spendingPublicKey: HexString;
  viewingPublicKey: HexString;
}): HexString {
  if (!isValidPublicKey(spendingPublicKey)) {
    throw new Error('Invalid spending public key');
  }

  if (!isValidPublicKey(viewingPublicKey)) {
    throw new Error('Invalid viewing public key');
  }

  const stealthMetaAddress: HexString = `0x${spendingPublicKey.slice(
    2
  )}${viewingPublicKey.slice(2)}`;

  return stealthMetaAddress;
}

export default generateStealthMetaAddressFromKeys;
