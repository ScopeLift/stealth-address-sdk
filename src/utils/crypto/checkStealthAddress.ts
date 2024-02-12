import { getSharedSecret, ProjectivePoint } from '@noble/secp256k1';
import type { ICheckStealthAddressParams } from './types';
import {
  getHashedSharedSecret,
  getStealthPublicKey,
  getViewTag,
  handleSchemeId,
  publicKeyToAddress,
} from '.';

/**
 * Checks if a given announcement is intended for the user with a specific viewing private key and spending public key.
 * @param {HexString} ephemeralPublicKey The ephemeral public key from the announcement.
 * @param {HexString} spendingPublicKey The spending public key of the user.
 * @param {HexString} userStealthAddress The stealth address of the user.
 * @param {HexString} viewingPrivateKey The viewing private key of the user.
 * @param {HexString} viewTag The view tag from the announcement.
 * @param {VALID_SCHEME_ID} schemeId The scheme ID of the announcement.
 * @returns {boolean} True if the announcement is for the user, false otherwise.
 */
function checkStealthAddress({
  ephemeralPublicKey,
  schemeId,
  spendingPublicKey,
  userStealthAddress,
  viewingPrivateKey,
  viewTag,
}: ICheckStealthAddressParams) {
  handleSchemeId(schemeId);

  const sharedSecret = getSharedSecret(viewingPrivateKey, ephemeralPublicKey);

  const hashedSharedSecret = getHashedSharedSecret({ sharedSecret, schemeId });

  const computedViewTag = getViewTag({ hashedSharedSecret, schemeId });

  if (computedViewTag !== viewTag) {
    // View tags do not match; this announcement is not for the user
    return false;
  }

  const stealthPublicKey = getStealthPublicKey({
    spendingPublicKey,
    hashedSharedSecret,
    schemeId,
  });

  // Derive the stealth address from the stealth public key
  const stealthAddress = publicKeyToAddress({
    publicKey: stealthPublicKey,
    schemeId,
  });

  // Compare derived stealth address with the user's stealth address
  return stealthAddress === userStealthAddress;
}

export default checkStealthAddress;
