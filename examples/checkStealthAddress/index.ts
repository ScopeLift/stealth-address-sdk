import {
  VALID_SCHEME_ID,
  checkStealthAddress,
  generateRandomStealthMetaAddress,
  generateStealthAddress
} from 'stealth-address-sdk';

// User's keys (for example purposes, real values should be securely generated and stored)
const {
  stealthMetaAddressURI,
  spendingPublicKey: userSpendingPublicKey,
  viewingPrivateKey: userViewingPrivateKey
} = generateRandomStealthMetaAddress();

// Generate a stealth address
const { stealthAddress, ephemeralPublicKey, viewTag } = generateStealthAddress({
  schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
  stealthMetaAddressURI
});

console.log(`Stealth Address: ${stealthAddress}`);
console.log(`Ephemeral Public Key: ${ephemeralPublicKey}`);
console.log(`View Tag: ${viewTag}`);

// Check if an announcement (simulated here) is for the user
const isForUser = checkStealthAddress({
  ephemeralPublicKey, // From the announcement
  schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
  spendingPublicKey: userSpendingPublicKey,
  userStealthAddress: stealthAddress, // User's known stealth address
  viewingPrivateKey: userViewingPrivateKey,
  viewTag // From the announcement
});

console.log(`Is the announcement for the user? ${isForUser}`);
