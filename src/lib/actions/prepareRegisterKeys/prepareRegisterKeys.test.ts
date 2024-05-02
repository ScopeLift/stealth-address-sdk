import { beforeAll, describe, expect, test } from 'bun:test';
import type { Address, Chain, TransactionReceipt } from 'viem';
import {
  type PrepareRegisterKeysParams,
  VALID_SCHEME_ID,
  parseStealthMetaAddressURI
} from '../../..';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../helpers/types';
import type { StealthActions } from '../../stealthClient/types';
import { PrepareError } from '../types';

describe('prepareRegisterKeys', () => {
  let stealthClient: StealthActions;
  let ERC6538Address: Address;
  let walletClient: SuperWalletClient;
  let account: Address | undefined;
  let chain: Chain | undefined;

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
    account = walletClient.account?.address;
    if (!account) throw new Error('No account found');
    chain = walletClient.chain;
    if (!chain) throw new Error('No chain found');

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
