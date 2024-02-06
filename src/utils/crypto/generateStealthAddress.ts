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
  Valid_Stealth_Meta_Address_Chain,
} from "./types";
import {
  publicKeyToAddress as publicKeyToAddressViem,
  keccak256,
  bytesToHex,
} from "viem/utils";

// Function to generate a stealth address from a given stealth meta-address
function generateStealthAddress({
  stealthMetaAddressURI,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
  ephemeralPrivateKey,
}: IGenerateStealthAddress): GenerateStealthAddressReturnType {
  const stealthMetaAddress = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId,
  });

  if (!validateStealthMetaAddress({ stealthMetaAddress })) {
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

// Parses a stealth meta-address URI and extracts the address data
function parseStealthMetaAddressURI({
  stealthMetaAddressURI,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
}: {
  stealthMetaAddressURI: string;
  schemeId?: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  const parts = stealthMetaAddressURI.split(":");

  if (
    parts.length !== 3 ||
    parts[0] !== "st" ||
    !(parts[1] in Valid_Stealth_Meta_Address_Chain)
  ) {
    throw new Error("Invalid stealth meta-address format");
  }

  return parts[2] as HexString;
}

function validateStealthMetaAddress({
  stealthMetaAddress,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
}: {
  stealthMetaAddress: string;
  schemeId?: VALID_SCHEME_ID;
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
 * Computes a shared secret
 * @param {Uint8Array} ephemeralPrivateKey - The sender's ephemeral private key
 * @param {Uint8Array} recipientViewingPublicKey - The recipient's viewing public key
 * @returns {string} The shared secret
 */
function computeSharedSecret({
  ephemeralPrivateKey,
  recipientViewingPublicKey,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
}: {
  ephemeralPrivateKey: Uint8Array;
  recipientViewingPublicKey: Uint8Array;
  schemeId?: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  // Use seccp25k1 to compute the shared secret if scheme 1
  return getSharedSecret(ephemeralPrivateKey, recipientViewingPublicKey) as Hex;
}

// Function to hash the shared secret to derive the stealth scalar (offset)
function getHashedSharedSecret({
  sharedSecret,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
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

function generatePrivateKey({
  ephemeralPrivateKey,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
}: {
  ephemeralPrivateKey?: Uint8Array;
  schemeId?: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  // TODO: handle example custom logic to validate the ephemeral private key

  // Or use scheme 1 validation
  if (ephemeralPrivateKey && utils.isValidPrivateKey(ephemeralPrivateKey)) {
    return ephemeralPrivateKey;
  }

  return utils.randomPrivateKey();
}

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

function getViewTag({
  hashedSharedSecret,
  schemeId,
}: {
  hashedSharedSecret: Hex;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);

  // TODO ensure this is adhering to this: The view tag is extracted by taking the most significant byte
  return hashedSharedSecret.slice(0, 2);
}

function getStealthPublicKey({
  spendingPublicKey,
  hashedSharedSecret,
  schemeId = VALID_SCHEME_ID.SCHEME_ID_1,
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

function publicKeyToAddress({
  publicKey,
  schemeId,
}: {
  publicKey: Uint8Array;
  schemeId: VALID_SCHEME_ID;
}) {
  handleSchemeId(schemeId);
  // Use viem to convert the public key to an address
  return publicKeyToAddressViem(bytesToHex(publicKey));
}

export { generateStealthAddress };
export default generateStealthAddress;
