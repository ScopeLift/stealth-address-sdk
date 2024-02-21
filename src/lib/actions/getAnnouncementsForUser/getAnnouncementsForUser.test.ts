import { expect, test, describe } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import { VALID_SCHEME_ID, generateStealthAddress } from '../../../utils/crypto';
import { ERC5564AnnouncerAbi } from '../../abi';

describe('getAnnouncementsForUser', async () => {
  const { stealthClient, ERC5564Address, ERC5564DeployBlock } = setupTestEnv();
  const walletClient = setupTestWallet();
  const { stealthMetaAddressURI, spendingPublicKey, viewingPrivateKey } =
    setupTestStealthKeys();
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const fromBlock = ERC5564DeployBlock;

  // Set up stealth address details
  const { stealthAddress, ephemeralPublicKey, viewTag } =
    generateStealthAddress({
      stealthMetaAddressURI,
      schemeId,
    });

  // Announce the stealth address, ephemeral public key, and view tag
  const hash = await walletClient.writeContract({
    address: ERC5564Address,
    functionName: 'announce',
    args: [BigInt(schemeId), stealthAddress, ephemeralPublicKey, viewTag],
    abi: ERC5564AnnouncerAbi,
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  console.log('Waiting for announcement transaction to be mined...');
  // Wait for the transaction to be mined
  const res = await walletClient.waitForTransactionReceipt({
    hash,
  });
  console.log('Announcement transaction mined:', res.transactionHash);

  // Fetch relevant announcements to check against
  console.log('fetching announcements...');
  const announcements = await stealthClient.getAnnouncements({
    ERC5564Address,
    args: {
      schemeId: BigInt(schemeId),
      stealthAddress,
      caller: walletClient.account?.address, // Just an example; the caller is the address of the wallet since it called announce
    },
    fromBlock,
  });
  console.log('relevant announcements fetched for testing');

  test('filters announcements correctly for the user', async () => {
    // Fetch announcements for the specific user
    const results = await stealthClient.getAnnouncementsForUser({
      announcements,
      spendingPublicKey,
      viewingPrivateKey,
    });

    expect(results[0].stealthAddress).toEqual(stealthAddress);

    // Now change the spending public key and check that the results are empty
    const results2 = await stealthClient.getAnnouncementsForUser({
      announcements,
      spendingPublicKey: '0x',
      viewingPrivateKey,
    });

    expect(results2.length).toBe(0);

    // Now change the viewing private key and check that the results are empty
    const results3 = await stealthClient.getAnnouncementsForUser({
      announcements,
      spendingPublicKey,
      viewingPrivateKey: '0x',
    });

    expect(results3.length).toBe(0);
  });
});
