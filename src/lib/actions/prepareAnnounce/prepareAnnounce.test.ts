import { describe, test, expect } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import { VALID_SCHEME_ID, generateStealthAddress } from '../../..';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';

describe('prepareAnnounce', async () => {
  const { stealthClient, ERC5564Address } = await setupTestEnv();
  const walletClient = await setupTestWallet();
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddressURI } = setupTestStealthKeys(schemeId);
  const account = walletClient.account?.address!;

  const { stealthAddress, ephemeralPublicKey, viewTag } =
    generateStealthAddress({
      stealthMetaAddressURI,
      schemeId,
    });

  const prepared = await stealthClient.prepareAnnounce({
    account,
    args: {
      schemeId,
      stealthAddress,
      ephemeralPublicKey,
      metadata: viewTag,
    },
    ERC5564Address,
  });

  // Prepare tx using viem and the prepared payload
  const request = await walletClient.prepareTransactionRequest({
    ...prepared,
    chain: walletClient.chain,
    account: walletClient.account,
  });

  const hash = await walletClient.sendTransaction({
    ...request,
    chain: walletClient.chain,
  });

  const res = await walletClient.waitForTransactionReceipt({ hash });

  test('should successfully announce the stealth address details using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
