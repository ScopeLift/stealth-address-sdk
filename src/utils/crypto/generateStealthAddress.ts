import {
  ProjectivePoint,
  getPublicKey as getPublicKeySecp256k1,
  getSharedSecret,
  utils
} from '@noble/secp256k1';
import {
  bytesToHex,
  hexToBytes,
  keccak256,
  publicKeyToAddress as publicKeyToAddressViem
} from 'viem/utils';
import {
  type EthAddress,
  type GenerateStealthAddressReturnType,
  type Hex,
  type HexString,
  type IGenerateStealthAddressParams,
  VALID_SCHEME_ID
} from './types';

/**
 * @description Generates a stealth address from a given stealth meta-address.
 * This function is designed to support stealth address usage in accordance with the ERC-5564 standard
 * for Ethereum, focusing on the implementation of scheme 1 with extensibility for additional schemes.
 *
 * @param {IGenerateStealthAddressParams} params Parameters for generating a stealth address:
 * - `stealthMetaAddressURI`: The URI containing the stealth meta-address.
 *   Should adhere to the format: "st:\<chain\>:\<stealthMetaAddress\>",
 *   where <chain> is the chain identifier and <stealthMetaAddress> is the stealth meta-address.
 * - `schemeId`: (Optional) The scheme identifier, defaults to SCHEME_ID_1.
 * - `ephemeralPrivateKey`: (Optional) The ephemeral private key to use; if not provided, a new one is generated.
 * @returns {GenerateStealthAddressReturnType} Object containing:
 *   - `stealthAddress`: The generated stealth address.
 *   - `ephemeralPublicKey`: The ephemeral public key used to generate the stealth address.
 *   - `viewTag`: The view tag derived from the hashed shared secret.
 */
function generateStealthAddress({
  stealthMetaAddressURI,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
  ephemeralPrivateKey
}: IGenerateStealthAddressParams): GenerateStealthAddressReturnType {
  const stealthMetaAddress = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId
  });

  if (!validateStealthMetaAddress({ stealthMetaAddress, schemeId })) {
    throw new Error('Invalid stealth meta-address');
  }

  const ephemeralPrivateKeyToUse = generatePrivateKey({
    ephemeralPrivateKey,
    schemeId
  });

  // Compute the ephemeral public key from the ephemeral private key
  const ephemeralPublicKey = getPublicKey({
    privateKey: ephemeralPrivateKeyToUse,
    compressed: true,
    schemeId
  });

  const { spendingPublicKey, viewingPublicKey } =
    parseKeysFromStealthMetaAddress({
      stealthMetaAddress,
      schemeId
    });

  const sharedSecret = computeSharedSecret({
    ephemeralPrivateKey: ephemeralPrivateKeyToUse,
    recipientViewingPublicKey: viewingPublicKey,
    schemeId
  });

  const hashedSharedSecret = getHashedSharedSecret({ sharedSecret, schemeId });

  const viewTag = getViewTag({ hashedSharedSecret, schemeId });

  const stealthPublicKey = getStealthPublicKey({
    spendingPublicKey,
    hashedSharedSecret,
    schemeId
  });

  const stealthAddress = publicKeyToAddress({
    publicKey: stealthPublicKey,
    schemeId
  });

  return {
    stealthAddress,
    ephemeralPublicKey: bytesToHex(ephemeralPublicKey),
    viewTag
  };
}

/**
 * @description Parses a stealth meta-address URI and extracts the address data.
 * Validates the structure and format of the stealth meta-address.
 *
 * @param {object} params - Parameters for parsing the stealth meta-address URI:
 *   - stealthMetaAddressURI: The URI containing the stealth meta-address.
 *   - schemeId: The scheme identifier.
 * @returns {HexString} The extracted stealth meta-address.
 */
function parseStealthMetaAddressURI({
  stealthMetaAddressURI,
  schemeId
}: {
  stealthMetaAddressURI: string;
  schemeId: VALID_SCHEME_ID;
}): HexString {
  handleSchemeId(schemeId);

  const parts = stealthMetaAddressURI.split(':');

  if (parts.length !== 3 || parts[0] !== 'st') {
    throw new Error('Invalid stealth meta-address URI format');
  }

  return parts[2] as HexString;
}

/**
 * @description Validates the format and structure of a stealth meta-address based on the specified scheme.
 *
 * @param {object} params - Parameters for validating a stealth meta-address:
 *   - stealthMetaAddress: The stealth meta-address to validate.
 *   - schemeId: The scheme identifier.
 * @returns {boolean} True if the stealth meta-address is valid, false otherwise.
 */
function validateStealthMetaAddress({
  stealthMetaAddress,
  schemeId
}: {
  stealthMetaAddress: string;
  schemeId: VALID_SCHEME_ID;
}): boolean {
  handleSchemeId(schemeId);

  // Remove the '0x' prefix if present
  const cleanedStealthMetaAddress = stealthMetaAddress.startsWith('0x')
    ? stealthMetaAddress.substring(2)
    : stealthMetaAddress;

  // Check if stealthMetaAddress contains only valid hex characters
  if (!/^[a-fA-F0-9]+$/.test(cleanedStealthMetaAddress)) {
    return false; // Contains non-hex characters
  }

  // Allow for a single key used for both spending and viewing, or two distinct keys
  if (![66, 132].includes(cleanedStealthMetaAddress.length)) {
    return false;
  }

  // Validate the format of each public key
  const singlePublicKeyHexLength = 66; // Length for compressed keys
  const spendingPublicKey = cleanedStealthMetaAddress.slice(
    0,
    singlePublicKeyHexLength
  );
  const viewingPublicKey =
    cleanedStealthMetaAddress.length === 132
      ? cleanedStealthMetaAddress.slice(singlePublicKeyHexLength)
      : spendingPublicKey; // Use the same key for spending and viewing if only one is provided

  if (
    !isValidCompressedPublicKey(spendingPublicKey) ||
    !isValidCompressedPublicKey(viewingPublicKey)
  ) {
    return false;
  }

  return true;
}

/**
 * @description Validates a compressed public key.
 * A compressed public key is a 66-character hexadecimal string that starts with '02' or '03'.
 * The function takes a non '0x' prefixed public key as input.
 * @param publicKey
 * @returns
 */
function isValidCompressedPublicKey(publicKey: string): boolean {
  return (
    (publicKey.startsWith('02') || publicKey.startsWith('03')) &&
    publicKey.length === 66
  );
}

/**
 * @description Extracts and validates the spending and viewing public keys from a stealth meta-address.
 *
 * @param {object} params - Parameters for extracting keys from a stealth meta-address:
 *   - stealthMetaAddress: The stealth meta-address.
 *   - schemeId: The scheme identifier.
 * @returns {object} An object containing:
 *   - spendingPublicKey: The extracted spending public key.
 *   - viewingPublicKey: The extracted viewing public key.
 */
function parseKeysFromStealthMetaAddress({
  stealthMetaAddress,
  schemeId
}: {
  stealthMetaAddress: HexString;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  const cleanedStealthMetaAddress = stealthMetaAddress.slice(2);
  const singlePublicKeyHexLength = 66; // Length for compressed keys
  const spendingPublicKeyHex = cleanedStealthMetaAddress.slice(
    0,
    singlePublicKeyHexLength
  );
  const viewingPublicKeyHex =
    cleanedStealthMetaAddress.length === 132
      ? cleanedStealthMetaAddress.slice(singlePublicKeyHexLength)
      : spendingPublicKeyHex; // Use the same key for spending and viewing if only one is provided

  return {
    spendingPublicKey:
      ProjectivePoint.fromHex(spendingPublicKeyHex).toRawBytes(true), // Compressed
    viewingPublicKey:
      ProjectivePoint.fromHex(viewingPublicKeyHex).toRawBytes(true) // Compressed
  };
}

/**
 * @description Computes a shared secret based on the scheme
 *
 * @param {object} params - Parameters for computing the shared secret:
 *   - ephemeralPrivateKey: The sender's ephemeral private key.
 *   - recipientViewingPublicKey: The recipient's viewing public key.
 *   - schemeId: The scheme identifier.
 * @returns {Uint8Array} The computed shared secret.
 */
function computeSharedSecret({
  ephemeralPrivateKey,
  recipientViewingPublicKey,
  schemeId
}: {
  ephemeralPrivateKey: Uint8Array;
  recipientViewingPublicKey: Uint8Array;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  // Use seccp25k1 to compute the shared secret if scheme 1
  return getSharedSecret(ephemeralPrivateKey, recipientViewingPublicKey);
}

/**
 * @description Hashes the shared secret based on the scheme.
 *
 * @param {object} params - Parameters for hashing the shared secret:
 *   - sharedSecret: The shared secret to be hashed.
 *   - schemeId: The scheme identifier.
 * @returns {HexString} The hashed shared secret.
 */
function getHashedSharedSecret({
  sharedSecret,
  schemeId
}: {
  sharedSecret: Hex;
  schemeId: VALID_SCHEME_ID;
}): HexString {
  handleSchemeId(schemeId);
  return keccak256(sharedSecret);
}

function isSchemeId1(schemeId: VALID_SCHEME_ID) {
  return schemeId === VALID_SCHEME_ID.SCHEME_ID_1;
}

function handleSchemeId(schemeId: VALID_SCHEME_ID) {
  if (!isSchemeId1(schemeId)) {
    throw new Error(`Unsupported schemeId: ${schemeId}`);
  }
}

/**
 * @description Generates or validates an ephemeral private key.
 *
 * @param {object} params - Parameters for generating or validating the private key:
 *   - ephemeralPrivateKey: (optional) The ephemeral private key to validate.
 *   - schemeId: The scheme identifier.
 * @returns {Uint8Array} The validated or generated private key.
 */
function generatePrivateKey({
  ephemeralPrivateKey,
  schemeId
}: {
  ephemeralPrivateKey?: Uint8Array;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  // TODO: handle example custom logic to validate the ephemeral private key

  // Or use scheme 1 validation
  if (ephemeralPrivateKey && utils.isValidPrivateKey(ephemeralPrivateKey)) {
    return ephemeralPrivateKey;
  }

  return utils.randomPrivateKey();
}

/**
 * @description Retrieves the public key from the given private key.
 *
 * @param {object} params - Parameters for retrieving the public key:
 *   - privateKey: The private key.
 *   - compressed: (optional) A boolean indicating whether the public key should be compressed.
 *   - schemeId: The scheme identifier.
 * @returns {Uint8Array} The corresponding public key.
 */
function getPublicKey({
  privateKey,
  compressed,
  schemeId
}: {
  privateKey: Uint8Array;
  compressed: boolean;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);
  return getPublicKeySecp256k1(privateKey, compressed);
}

/**
 * @description Extracts the view tag from the hashed shared secret.
 *
 * @param {object} params - Parameters for extracting the view tag:
 *   - hashedSharedSecret: The hashed shared secret.
 *   - schemeId: The scheme identifier.
 * @returns {HexString} The extracted view tag.
 */
function getViewTag({
  hashedSharedSecret,
  schemeId
}: {
  hashedSharedSecret: Hex;
  schemeId: VALID_SCHEME_ID;
}): HexString {
  handleSchemeId(schemeId);

  // The view tag is extracted by taking the most significant byte
  return `0x${hashedSharedSecret.toString().substring(2, 4)}`;
}

/**
 * @description Calculates the stealth public key; for scheme 1, adds the hashed shared secret point to the spending public key.
 *
 * @param {object} params - Parameters for calculating the stealth public key:
 *   - spendingPublicKey: The spending public key.
 *   - hashedSharedSecret: The hashed shared secret.
 *   - schemeId: The scheme identifier.
 * @returns {Uint8Array} The stealth public key.
 */
function getStealthPublicKey({
  spendingPublicKey,
  hashedSharedSecret,
  schemeId
}: {
  spendingPublicKey: Uint8Array;
  hashedSharedSecret: HexString;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);
  const hashedSharedSecretPoint = ProjectivePoint.fromPrivateKey(
    hexToBytes(hashedSharedSecret)
  );
  return ProjectivePoint.fromHex(spendingPublicKey)
    .add(hashedSharedSecretPoint)
    .toRawBytes(false);
}

/**
 * @description Converts a public key to an Ethereum address.
 *
 * @param {object} params - Parameters for converting the public key to an address:
 *   - publicKey: The public key.
 *   - schemeId: The scheme identifier.
 * @returns {EthAddress} The Ethereum address derived from the public key.
 */
function publicKeyToAddress({
  publicKey,
  schemeId
}: {
  publicKey: Hex;
  schemeId: VALID_SCHEME_ID;
}): EthAddress {
  handleSchemeId(schemeId);
  // Use viem to convert the public key to an address
  return publicKeyToAddressViem(
    typeof publicKey !== 'string' ? bytesToHex(publicKey) : publicKey
  );
}

export {
  generatePrivateKey,
  generateStealthAddress,
  getHashedSharedSecret,
  getStealthPublicKey,
  getViewTag,
  handleSchemeId,
  parseKeysFromStealthMetaAddress,
  parseStealthMetaAddressURI,
  publicKeyToAddress,
  isValidCompressedPublicKey
};
export default generateStealthAddress;
