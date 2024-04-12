import { describe, test, expect } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import { VALID_SCHEME_ID, parseStealthMetaAddressURI } from '../../..';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import { PrepareError } from '../types';

describe('prepareRegisterKeys', async () => {
  const { stealthClient, ERC6538Address } = await setupTestEnv();
  const walletClient = await setupTestWallet();
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddressURI } = setupTestStealthKeys(schemeId);
  const stealthMetaAddressToRegister = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId,
  });
  const account = walletClient.account?.address!;
  const chain = walletClient.chain!;

  const prepareArgs = {
    account,
    ERC6538Address,
    schemeId,
    stealthMetaAddress: stealthMetaAddressToRegister,
  };

  const prepared = await stealthClient.prepareRegisterKeys(prepareArgs);

  // Prepare tx using viem and the prepared payload
  const request = await walletClient.prepareTransactionRequest({
    ...prepared,
    chain,
    account,
  });

  const hash = await walletClient.sendTransaction({
    ...request,
    chain,
    account,
  });

  const res = await walletClient.waitForTransactionReceipt({ hash });

  test('should throw PrepareError when given invalid contract address', () => {
    const invalidERC6538Address = '0xinvalid';
    expect(
      stealthClient.prepareRegisterKeys({
        ...prepareArgs,
        ERC6538Address: invalidERC6538Address,
      })
    ).rejects.toBeInstanceOf(PrepareError);
  });

  test('should successfully register a stealth meta-address using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
