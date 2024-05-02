import { beforeAll, describe, expect, test } from 'bun:test';
import type { Address, Chain, TransactionReceipt } from 'viem';
import { VALID_SCHEME_ID, generateStealthAddress } from '../../..';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../helpers/types';
import type { StealthActions } from '../../stealthClient/types';
import { PrepareError } from '../types';

describe('prepareAnnounce', () => {
  let stealthClient: StealthActions;
  let ERC5564Address: Address;
  let walletClient: SuperWalletClient;
  let account: Address | undefined;
  let chain: Chain | undefined;

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddressURI } = setupTestStealthKeys(schemeId);
  const { stealthAddress, ephemeralPublicKey, viewTag } =
    generateStealthAddress({
      stealthMetaAddressURI,
      schemeId
    });

  const prepareArgs = {
    schemeId,
    stealthAddress,
    ephemeralPublicKey,
    metadata: viewTag
  };

  // Transaction receipt for writing to the contract with the prepared payload
  let res: TransactionReceipt;

  beforeAll(async () => {
    // Set up the test environment
    ({ stealthClient, ERC5564Address } = await setupTestEnv());
    walletClient = await setupTestWallet();
    account = walletClient.account?.address;
    chain = walletClient.chain;

    if (!account) throw new Error('No account found');
    if (!chain) throw new Error('No chain found');

    const prepared = await stealthClient.prepareAnnounce({
      account,
      args: prepareArgs,
      ERC5564Address
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

  test('should throw PrepareError when given invalid params', () => {
    if (!account) throw new Error('No account found');

    const invalidERC5564Address = '0xinvalid';
    expect(
      stealthClient.prepareAnnounce({
        account,
        args: prepareArgs,
        ERC5564Address: invalidERC5564Address
      })
    ).rejects.toBeInstanceOf(PrepareError);
  });

  test('should successfully announce the stealth address details using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
