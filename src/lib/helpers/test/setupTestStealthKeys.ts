import { VALID_SCHEME_ID, generateRandomStealthMetaAddress } from '../../..';

function setupTestStealthKeys(schemeId: VALID_SCHEME_ID) {
  const {
    spendingPrivateKey,
    spendingPublicKey,
    stealthMetaAddressURI,
    viewingPrivateKey,
    viewingPublicKey,
  } = generateRandomStealthMetaAddress();

  return {
    spendingPublicKey,
    spendingPrivateKey,
    viewingPublicKey,
    viewingPrivateKey,
    stealthMetaAddressURI,
  };
}

export default setupTestStealthKeys;
