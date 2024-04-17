import { bytesToHex, hexToBytes, isHex, keccak256 } from 'viem';
import type { HexString } from '../crypto/types';
import { getPublicKey } from '@noble/secp256k1';

/**
 * Generates spending and viewing public and private keys from a signature.
 * @param signature as a hexadecimal string.
 * @returns The spending and viewing public and private keys as hexadecimal strings.
 */
function generateKeysFromSignature(signature: HexString): {
  spendingPublicKey: HexString;
  spendingPrivateKey: HexString;
  viewingPublicKey: HexString;
  viewingPrivateKey: HexString;
} {
  // Validate signature
  const isValidSignature = (sig: string) => isHex(sig) && sig.length === 132;

  if (!isValidSignature(signature)) {
    throw new Error(`Invalid signature: ${signature}`);
  }

  // Split hex string signature into two 32 byte chunks
  const startIndex = 2; // first two characters are 0x, so skip these
  const length = 64; // each 32 byte chunk is in hex, so 64 characters
  const portion1 = signature.slice(startIndex, startIndex + length);
  const portion2 = signature.slice(
    startIndex + length,
    startIndex + length + length
  );
  const lastByte = signature.slice(signature.length - 2);

  if (`0x${portion1}${portion2}${lastByte}` !== signature) {
    throw new Error('Signature incorrectly generated or parsed');
  }

  // Generate private keys from the signature portions
  // Convert from hex to bytes to be used with the noble library
  const spendingPrivateKey = hexToBytes(keccak256(`0x${portion1}`));
  const viewingPrivateKey = hexToBytes(keccak256(`0x${portion2}`));

  // Generate the compressed public keys from the private keys
  const spendingPublicKey = bytesToHex(getPublicKey(spendingPrivateKey, true));
  const viewingPublicKey = bytesToHex(getPublicKey(viewingPrivateKey, true));

  return {
    spendingPublicKey,
    spendingPrivateKey: bytesToHex(spendingPrivateKey),
    viewingPublicKey,
    viewingPrivateKey: bytesToHex(viewingPrivateKey)
  };
}

export default generateKeysFromSignature;
