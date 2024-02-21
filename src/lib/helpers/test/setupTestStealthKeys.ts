function setupTestStealthKeys() {
  const spendingPublicKey = process.env.TEST_SPENDING_PUBLIC_KEY as
    | `0x${string}`
    | undefined;
  if (!spendingPublicKey) {
    throw new Error('TEST_SPENDING_PUBLIC_KEY is not defined');
  }

  const spendingPrivateKey = process.env.TEST_SPENDING_PRIVATE_KEY as
    | `0x${string}`
    | undefined;
  if (!spendingPrivateKey) {
    throw new Error('TEST_SPENDING_PRIVATE_KEY is not defined');
  }

  const viewingPublicKey = process.env.TEST_VIEWING_PUBLIC_KEY as
    | `0x${string}`
    | undefined;
  if (!viewingPublicKey) {
    throw new Error('TEST_VIEWING_PUBLIC_KEY is not defined');
  }

  const viewingPrivateKey = process.env.TEST_VIEWING_PRIVATE_KEY as
    | `0x${string}`
    | undefined;
  if (!viewingPrivateKey) {
    throw new Error('TEST_VIEWING_PRIVATE_KEY is not defined');
  }

  const stealthMetaAddressURI = process.env.TEST_STEALTH_META_ADDRESS_URI as
    | `0x${string}`
    | undefined;
  if (!stealthMetaAddressURI) {
    throw new Error('TEST_STEALTH_META_ADDRESS_URI is not defined');
  }

  return {
    spendingPublicKey,
    spendingPrivateKey,
    viewingPublicKey,
    viewingPrivateKey,
    stealthMetaAddressURI,
  };
}

export default setupTestStealthKeys;
