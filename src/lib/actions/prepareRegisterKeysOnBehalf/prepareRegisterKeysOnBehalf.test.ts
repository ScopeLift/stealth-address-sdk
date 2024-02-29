import { describe, test, expect } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import { VALID_SCHEME_ID, parseStealthMetaAddressURI } from '../../..';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import type { RegisterKeysOnBehalfArgs } from './types';

describe('prepareRegisterKeysOnBehalf', async () => {
  const { stealthClient, ERC6538Address } = setupTestEnv();
  const walletClient = setupTestWallet();
  const { stealthMetaAddressURI } = setupTestStealthKeys();
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const stealthMetaAddressToRegister = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId,
  });
  const account = walletClient.account?.address!;

  const args: RegisterKeysOnBehalfArgs = {
    registrant: account,
    schemeId,
    stealthMetaAddress: stealthMetaAddressToRegister,
    signature: '0x1234567890', // TODO This is a placeholder for the signature
  };

  const prepared = await stealthClient.prepareRegisterKeysOnBehalf({
    account,
    ERC6538Address,
    args,
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

  test('should successfully register a stealth meta-address on behalf using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
