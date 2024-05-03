import { describe, test, expect } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import {
  ERC6538RegistryAbi,
  VALID_SCHEME_ID,
  generateRandomStealthMetaAddress,
} from '../../..';

describe('getStealthMetaAddress', async () => {
  const { stealthClient, ERC6538Address } = await setupTestEnv();
  const walletClient = await setupTestWallet();

  // Generate a random stealth meta address just for testing purposes
  const { stealthMetaAddress } = generateRandomStealthMetaAddress();

  // Register the stealth meta address
  const registrant = walletClient.account?.address!;
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;

  const hash = await walletClient.writeContract({
    address: ERC6538Address,
    functionName: 'registerKeys',
    args: [BigInt(schemeId), stealthMetaAddress],
    abi: ERC6538RegistryAbi,
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  console.log('Waiting for registration transaction to be mined...');
  const res = await walletClient.waitForTransactionReceipt({ hash });

  console.log('Registration transaction mined:', res.transactionHash);

  test('should return the stealth meta address for a given registrant and scheme ID', async () => {
    const result = await stealthClient.getStealthMetaAddress({
      ERC6538Address,
      registrant,
      schemeId,
    });

    expect(result).toEqual(stealthMetaAddress);
  });
});
