import { describe, test, expect } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import { VALID_SCHEME_ID, parseStealthMetaAddressURI } from '../../..';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';

describe('prepareRegisterKeys', async () => {
  const { stealthClient, ERC6538Address } = setupTestEnv();
  const walletClient = setupTestWallet();
  const { stealthMetaAddressURI } = setupTestStealthKeys();
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const stealthMetaAddressToRegister = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId,
  });
  const account = walletClient.account?.address!;

  const prepared = await stealthClient.prepareRegisterKeys({
    account,
    ERC6538Address,
    schemeId,
    stealthMetaAddress: stealthMetaAddressToRegister,
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

  test('should successfully register a stealth meta-address using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
