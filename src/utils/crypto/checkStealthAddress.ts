import { getSharedSecret } from '@noble/secp256k1';
import { hexToBytes } from 'viem';
import {
  getHashedSharedSecret,
  getStealthPublicKey,
  getViewTag,
  handleSchemeId,
  publicKeyToAddress
} from '.';
import type { ICheckStealthAddressParams } from './types';

/**
 * @description Checks if a given announcement is intended for the user.
 * @param {ICheckStealthAddressParams} params Parameters for checking if the announcement is intended for the user:
 *   - `ephemeralPublicKey`: The ephemeral public key from the announcement.
 *   - `spendingPublicKey`: The user's spending public key.
 *   - `userStealthAddress`: The user's stealth address, used to verify the derived stealth address.
 *   - `viewingPrivateKey`: The user's viewing private key.
 *   - `viewTag`: The view tag from the announcement, used to quickly filter announcements.
 *   - `schemeId`: The scheme ID.
 * @returns {boolean} True if the derived stealth address matches the user's stealth address, indicating
 * the announcement is intended for the user; false otherwise.
 */
function checkStealthAddress({
  ephemeralPublicKey,
  schemeId,
  spendingPublicKey,
  userStealthAddress,
  viewingPrivateKey,
  viewTag
}: ICheckStealthAddressParams) {
  handleSchemeId(schemeId);

  const sharedSecret = getSharedSecret(
    hexToBytes(viewingPrivateKey),
    hexToBytes(ephemeralPublicKey)
  );

  const hashedSharedSecret = getHashedSharedSecret({ sharedSecret, schemeId });

  const computedViewTag = getViewTag({ hashedSharedSecret, schemeId });

  if (computedViewTag !== viewTag) {
    // View tags do not match; this announcement is not for the user
    return false;
  }

  const stealthPublicKey = getStealthPublicKey({
    spendingPublicKey: hexToBytes(spendingPublicKey),
    hashedSharedSecret,
    schemeId
  });

  // Derive the stealth address from the stealth public key
  const stealthAddress = publicKeyToAddress({
    publicKey: stealthPublicKey,
    schemeId
  });

  return stealthAddress.toLowerCase() === userStealthAddress.toLowerCase();
}

export default checkStealthAddress;
