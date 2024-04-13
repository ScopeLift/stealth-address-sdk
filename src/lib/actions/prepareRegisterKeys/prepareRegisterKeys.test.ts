import { beforeAll, describe, test, expect } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import {
  VALID_SCHEME_ID,
  parseStealthMetaAddressURI,
  type PrepareRegisterKeysParams
} from '../../..';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import { PrepareError } from '../types';
import type { Address, Chain, TransactionReceipt } from 'viem';
import type { SuperWalletClient } from '../../helpers/types';
import type { StealthActions } from '../../stealthClient/types';

describe('prepareRegisterKeys', () => {
  let stealthClient: StealthActions,
    ERC6538Address: Address,
    walletClient: SuperWalletClient,
    account: Address,
    chain: Chain;

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddressURI } = setupTestStealthKeys(schemeId);
  const stealthMetaAddressToRegister = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId
  });

  // Prepare payload args
  let prepareArgs: PrepareRegisterKeysParams;
  // Transaction receipt for writing to the contract with the prepared payload
  let res: TransactionReceipt;

  beforeAll(async () => {
    // Set up the test environment
    ({ stealthClient, ERC6538Address } = await setupTestEnv());
    walletClient = await setupTestWallet();
    account = walletClient.account?.address!;
    chain = walletClient.chain!;

    prepareArgs = {
      account,
      ERC6538Address,
      schemeId,
      stealthMetaAddress: stealthMetaAddressToRegister
    } satisfies PrepareRegisterKeysParams;
    const prepared = await stealthClient.prepareRegisterKeys(prepareArgs);

    // Prepare tx using viem and the prepared payload
    const request = await walletClient.prepareTransactionRequest({
      ...prepared,
      chain,
      account
    });

    const hash = await walletClient.sendTransaction({
      ...request,
      chain,
      account
    });

    res = await walletClient.waitForTransactionReceipt({ hash });
  });
  test('should throw PrepareError when given invalid contract address', () => {
    const invalidERC6538Address = '0xinvalid';
    expect(
      stealthClient.prepareRegisterKeys({
        ...prepareArgs,
        ERC6538Address: invalidERC6538Address
      })
    ).rejects.toBeInstanceOf(PrepareError);
  });

  test('should successfully register a stealth meta-address using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
