import {
  getPublicKey as getPublicKeySecp256k1,
  getSharedSecret,
  Point,
  utils,
} from "noble-secp256k1";
import {
  type GenerateStealthAddressReturnType,
  type Hex,
  type HexString,
  type IGenerateStealthAddress,
  VALID_SCHEME_ID,
  type EthAddress,
} from "./types";
import {
  publicKeyToAddress as publicKeyToAddressViem,
  keccak256,
  bytesToHex,
} from "viem/utils";

/**
 * Generates a stealth address from a given stealth meta-address.
 * This function is designed to support stealth address usage in accordance with the ERC-5564 standard
 * for Ethereum, focusing on the implementation of scheme 1 with extensibility for additional schemes.
 *
 * @param {IGenerateStealthAddress} params - Parameters for generating a stealth address:
 *   - stealthMetaAddressURI: The URI containing the stealth meta-address. Should adhere to the format:
 *     "st:<chain>:<stealthMetaAddress>", where <chain> is the chain identifier and <stealthMetaAddress> is the stealth meta-address.
 *   - schemeId: (optional) The scheme identifier, defaults to SCHEME_ID_1.
 *   - ephemeralPrivateKey: (optional) The ephemeral private key to use; if not provided, a new one is generated.
 * @returns {GenerateStealthAddressReturnType} Object containing the stealth address, ephemeral public key, and view tag.
 */
function generateStealthAddress({
  stealthMetaAddressURI,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
  ephemeralPrivateKey,
}: IGenerateStealthAddress): GenerateStealthAddressReturnType {
  const stealthMetaAddress = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId,
  });

  if (!validateStealthMetaAddress({ stealthMetaAddress, schemeId })) {
    throw new Error("Invalid stealth meta-address");
  }

  const ephemeralPrivateKeyToUse = generatePrivateKey({
    ephemeralPrivateKey,
    schemeId,
  });

  // Compute the ephemeral public key from the ephemeral private key
  const ephemeralPublicKey = getPublicKey({
    privateKey: ephemeralPrivateKeyToUse,
    compressed: true,
    schemeId,
  });

  const { spendingPublicKey, viewingPublicKey } =
    parseKeysFromStealthMetaAddress({
      stealthMetaAddress,
      schemeId,
    });

  const sharedSecret = computeSharedSecret({
    ephemeralPrivateKey: ephemeralPrivateKeyToUse,
    recipientViewingPublicKey: viewingPublicKey,
    schemeId,
  });

  const hashedSharedSecret = getHashedSharedSecret({ sharedSecret, schemeId });

  const viewTag = getViewTag({ hashedSharedSecret, schemeId });

  const stealthPublicKey = getStealthPublicKey({
    spendingPublicKey,
    hashedSharedSecret,
    schemeId,
  });

  const stealthAddress = publicKeyToAddress({
    publicKey: stealthPublicKey,
    schemeId,
  });

  return {
    stealthAddress,
    ephemeralPublicKey: bytesToHex(ephemeralPublicKey),
    viewTag: `0x${viewTag}`,
  };
}

/**
 * Parses a stealth meta-address URI and extracts the address data.
 * Validates the structure and format of the stealth meta-address.
 *
 * @param {object} params - Parameters for parsing the stealth meta-address URI:
 *   - stealthMetaAddressURI: The URI containing the stealth meta-address.
 *   - schemeId: The scheme identifier.
 * @returns {HexString} The extracted stealth meta-address.
 */
function parseStealthMetaAddressURI({
  stealthMetaAddressURI,
  schemeId,
}: {
  stealthMetaAddressURI: string;
  schemeId: VALID_SCHEME_ID;
}): HexString {
  handleSchemeId(schemeId);

  const parts = stealthMetaAddressURI.split(":");

  if (parts.length !== 3 || parts[0] !== "st") {
    throw new Error("Invalid stealth meta-address format");
  }

  return parts[2] as HexString;
}

/**
 * Validates the format and structure of a stealth meta-address based on the specified scheme.
 *
 * @param {object} params - Parameters for validating a stealth meta-address:
 *   - stealthMetaAddress: The stealth meta-address to validate.
 *   - schemeId: The scheme identifier.
 * @returns {boolean} True if the stealth meta-address is valid, false otherwise.
 */
function validateStealthMetaAddress({
  stealthMetaAddress,
  schemeId,
}: {
  stealthMetaAddress: string;
  schemeId: VALID_SCHEME_ID;
}): boolean {
  handleSchemeId(schemeId);

  // Example validation for a stealth meta-address
  // Adjust the validation logic based on your specific stealth address scheme

  // Check if the address is of expected length
  // For a single public key scheme, it might be 33 bytes (compressed EC point), so 66 hex characters
  // For a dual public key scheme, it might be 66 bytes, so 132 hex characters
  const expectedLengthSchemeId1 = 132; // Example length for dual key scheme

  if (
    isSchemeId1(schemeId) &&
    Buffer.from(stealthMetaAddress, "hex").length === expectedLengthSchemeId1
  ) {
    return true;
  }

  // Further structure checks can be added here if needed

  return false;
}

/**
 * Extracts and validates the spending and viewing public keys from a stealth meta-address.
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
  schemeId,
}: {
  stealthMetaAddress: HexString;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  // For a single public key scheme, the stealth address is the public key
  // Example for a single public key scheme
  //   const publicKey = stealthAddress;
  // For a dual public key scheme, the stealth address is the concatenation of the two public keys
  // Example for a dual public key scheme
  const spendingPublicKey = stealthMetaAddress.slice(0, 66);
  const viewingPublicKey = stealthMetaAddress.slice(66);

  if (
    !isValidPublicKey({
      publicKey: spendingPublicKey,
      schemeId,
    })
  ) {
    throw new Error("Invalid spend public key");
  }

  if (
    !isValidPublicKey({
      publicKey: viewingPublicKey,
      schemeId,
    })
  ) {
    throw new Error("Invalid view public key");
  }

  return {
    spendingPublicKey: Point.fromHex(spendingPublicKey).toRawBytes(),
    viewingPublicKey: Point.fromHex(viewingPublicKey).toRawBytes(),
  };
}

/**
 * Checks if a given public key is valid based on the scheme.
 *
 * @param {object} params - Parameters for validating a public key:
 *   - publicKey: The public key to validate.
 *   - schemeId: The scheme identifier.
 * @returns {boolean} True if the public key is valid, false otherwise.
 */
function isValidPublicKey({
  publicKey,
  schemeId,
}: {
  publicKey: string;
  schemeId: VALID_SCHEME_ID;
}): boolean {
  handleSchemeId(schemeId);
  return !!Point.fromHex(publicKey);
}

/**
 * Computes a shared secret based on the scheme
 *
 * @param {object} params - Parameters for computing the shared secret:
 *   - ephemeralPrivateKey: The sender's ephemeral private key.
 *   - recipientViewingPublicKey: The recipient's viewing public key.
 *   - schemeId: The scheme identifier.
 * @returns {Hex} The computed shared secret.
 */
function computeSharedSecret({
  ephemeralPrivateKey,
  recipientViewingPublicKey,
  schemeId,
}: {
  ephemeralPrivateKey: Uint8Array;
  recipientViewingPublicKey: Uint8Array;
  schemeId: VALID_SCHEME_ID;
}): Hex {
  handleSchemeId(schemeId);

  // Use seccp25k1 to compute the shared secret if scheme 1
  return getSharedSecret(ephemeralPrivateKey, recipientViewingPublicKey) as Hex;
}

/**
 * Hashes the shared secret based on the scheme.
 *
 * @param {object} params - Parameters for hashing the shared secret:
 *   - sharedSecret: The shared secret to be hashed.
 *   - schemeId: The scheme identifier.
 * @returns {HexString} The hashed shared secret.
 */
function getHashedSharedSecret({
  sharedSecret,
  schemeId,
}: {
  sharedSecret: Hex;
  schemeId: VALID_SCHEME_ID;
}): HexString {
  handleSchemeId(schemeId);
  return keccak256(Buffer.from(sharedSecret.slice(1)));
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
 * Generates or validates an ephemeral private key.
 *
 * @param {object} params - Parameters for generating or validating the private key:
 *   - ephemeralPrivateKey: (optional) The ephemeral private key to validate.
 *   - schemeId: The scheme identifier.
 * @returns {Uint8Array} The validated or generated private key.
 */
function generatePrivateKey({
  ephemeralPrivateKey,
  schemeId,
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
 * Retrieves the public key from the given private key.
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
  schemeId,
}: {
  privateKey: Uint8Array;
  compressed: boolean;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);
  return getPublicKeySecp256k1(privateKey, compressed);
}

/**
 * Extracts the view tag from the hashed shared secret.
 *
 * @param {object} params - Parameters for extracting the view tag:
 *   - hashedSharedSecret: The hashed shared secret.
 *   - schemeId: The scheme identifier.
 * @returns {string} The extracted view tag.
 */
function getViewTag({
  hashedSharedSecret,
  schemeId,
}: {
  hashedSharedSecret: Hex;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  // TODO ensure this is adhering to this: The view tag is extracted by taking the most significant byte
  // TODO ensure the input type 'Hex' is what we want, and explicitly handle the output type
  return hashedSharedSecret.slice(0, 2);
}

/**
 * Calculates the stealth public key; for scheme 1, adds the hashed shared secret point to the spending public key.
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
  schemeId,
}: {
  spendingPublicKey: Uint8Array;
  hashedSharedSecret: HexString;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);
  const hashedSharedSecretPoint = Point.fromPrivateKey(
    Buffer.from(hashedSharedSecret, "hex")
  );
  return Point.fromHex(spendingPublicKey)
    .add(hashedSharedSecretPoint)
    .toRawBytes();
}

/**
 * Converts a public key to an Ethereum address.
 *
 * @param {object} params - Parameters for converting the public key to an address:
 *   - publicKey: The public key.
 *   - schemeId: The scheme identifier.
 * @returns {EthAddress} The Ethereum address derived from the public key.
 */
function publicKeyToAddress({
  publicKey,
  schemeId,
}: {
  publicKey: Uint8Array;
  schemeId: VALID_SCHEME_ID;
}): EthAddress {
  handleSchemeId(schemeId);
  // Use viem to convert the public key to an address
  return publicKeyToAddressViem(bytesToHex(publicKey));
}

export { generateStealthAddress };
export default generateStealthAddress;
