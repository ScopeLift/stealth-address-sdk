import { beforeAll, describe, expect, test } from 'bun:test';
import type { Address } from 'viem';
import {
  ERC6538RegistryAbi,
  VALID_SCHEME_ID,
  generateRandomStealthMetaAddress
} from '../../..';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../helpers/types';
import type { StealthActions } from '../../stealthClient/types';
import { GetStealthMetaAddressError } from './types';

describe('getStealthMetaAddress', () => {
  let stealthClient: StealthActions;
  let ERC6538Address: Address;
  let walletClient: SuperWalletClient;
  let registrant: Address | undefined;

  // Generate a random stealth meta address just for testing purposes
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddress } = generateRandomStealthMetaAddress();

  beforeAll(async () => {
    // Set up the test environment
    ({ stealthClient, ERC6538Address } = await setupTestEnv());
    walletClient = await setupTestWallet();

    // Register the stealth meta address
    registrant = walletClient.account?.address;
    if (!registrant) throw new Error('No registrant address found');

    const hash = await walletClient.writeContract({
      address: ERC6538Address,
      functionName: 'registerKeys',
      args: [BigInt(schemeId), stealthMetaAddress],
      abi: ERC6538RegistryAbi,
      chain: walletClient.chain,
      account: registrant
    });

    await walletClient.waitForTransactionReceipt({ hash });
  });

  test('should return the stealth meta address for a given registrant and scheme ID', async () => {
    if (!registrant) throw new Error('No registrant address found');

    const result = await stealthClient.getStealthMetaAddress({
      ERC6538Address,
      registrant,
      schemeId
    });

    expect(result).toEqual(stealthMetaAddress);
  });

  test('should throw an error if the stealth meta address cannot be fetched', async () => {
    const invalidRegistrant = '0xInvalidRegistrant';

    expect(
      stealthClient.getStealthMetaAddress({
        ERC6538Address,
        registrant: invalidRegistrant,
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1
      })
    ).rejects.toBeInstanceOf(GetStealthMetaAddressError);
  });
});
