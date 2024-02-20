import type { HexString } from '../crypto/types';

/**
 * Extracts the view tag from the metadata.
 *
 * @param metadata The hexadecimal string from which the view tag is extracted.
 * @returns The view tag as a hexadecimal string.
 */
function getViewTagFromMetadata(metadata: HexString): HexString {
  // Ensure metadata starts with "0x" and has enough length
  if (!metadata.startsWith('0x') || metadata.length < 4) {
    throw new Error('Invalid metadata format');
  }

  // The view tag should be the first byte of the metadata.
  // Since each byte is 2 characters in hex notation, we take the first 4 characters
  // which includes the "0x" prefix and the first byte.
  const viewTag = metadata.substring(0, 4) as HexString;

  return viewTag;
}

export default getViewTagFromMetadata;
