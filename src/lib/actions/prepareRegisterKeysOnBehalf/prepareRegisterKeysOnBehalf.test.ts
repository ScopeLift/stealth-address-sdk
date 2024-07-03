import { beforeAll, describe, expect, test } from 'bun:test';
import type { Address, TransactionReceipt } from 'viem';
import {
  VALID_SCHEME_ID,
  generateSignatureForRegisterKeysOnBehalf,
  parseStealthMetaAddressURI
} from '../../..';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import type { StealthActions } from '../../stealthClient/types';
import { PrepareError } from '../types';
import type { RegisterKeysOnBehalfArgs } from './types';

describe('prepareRegisterKeysOnBehalf', () => {
  let stealthClient: StealthActions;
  let account: Address | undefined;
  let args: RegisterKeysOnBehalfArgs;

  // Transaction receipt for writing to the contract with the prepared payload
  let res: TransactionReceipt;

  beforeAll(async () => {
    const {
      stealthClient: client,
      ERC6538Address,
      chainId
    } = await setupTestEnv();
    stealthClient = client;
    const walletClient = await setupTestWallet();
    const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
    const { stealthMetaAddressURI } = setupTestStealthKeys(schemeId);
    const stealthMetaAddressToRegister = parseStealthMetaAddressURI({
      stealthMetaAddressURI,
      schemeId
    });
    account = walletClient.account?.address;
    if (!account) throw new Error('No account found');
    const chain = walletClient.chain;
    if (!chain) throw new Error('No chain found');

    const signature = await generateSignatureForRegisterKeysOnBehalf({
      walletClient,
      account,
      ERC6538Address,
      chainId,
      schemeId,
      stealthMetaAddressToRegister
    });

    args = {
      registrant: account,
      schemeId,
      stealthMetaAddress: stealthMetaAddressToRegister,
      signature
    } satisfies RegisterKeysOnBehalfArgs;

    const prepared = await stealthClient.prepareRegisterKeysOnBehalf({
      account,
      ERC6538Address,
      args
    });

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
    if (!account) throw new Error('No account found');

    const invalidERC6538Address = '0xinvalid';

    expect(
      stealthClient.prepareRegisterKeysOnBehalf({
        account,
        ERC6538Address: invalidERC6538Address,
        args
      })
    ).rejects.toBeInstanceOf(PrepareError);
  });

  test('should successfully register a stealth meta-address on behalf using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
