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

  test('handles include and exclude lists correctly', async () => {
    // Just an example: the 'from' address of the announcement to use for filtering
    const fromAddressToTest = walletClient.account?.address!;
    const someOtherAddress = '0xD945323b7E5071598868989838414e679F29C0AB';

    // Test with an exclude list that should filter out the announcement
    const excludeListResults = await stealthClient.getAnnouncementsForUser({
      announcements,
      spendingPublicKey,
      viewingPrivateKey,
      excludeList: [fromAddressToTest],
    });

    expect(excludeListResults.length).toBe(0);

    // Test with an exclude list that doesn't have this from address
    const excludeListResults2 = await stealthClient.getAnnouncementsForUser({
      announcements,
      spendingPublicKey,
      viewingPrivateKey,
      excludeList: [someOtherAddress],
    });

    expect(excludeListResults2[0].stealthAddress).toEqual(stealthAddress);

    // Test with an include list that should only include the announcement
    const includeListResults = await stealthClient.getAnnouncementsForUser({
      announcements,
      spendingPublicKey,
      viewingPrivateKey,
      includeList: [fromAddressToTest],
    });

    expect(includeListResults[0].stealthAddress).toEqual(stealthAddress);

    // Test with an include list that doesn't have this from address
    const includeListResults2 = await stealthClient.getAnnouncementsForUser({
      announcements,
      spendingPublicKey,
      viewingPrivateKey,
      includeList: [someOtherAddress],
    });

    expect(includeListResults2.length).toBe(0);

    // Test with both an include and exclude list, which should exclude the announcement
    const includeAndExcludeListResults =
      await stealthClient.getAnnouncementsForUser({
        announcements,
        spendingPublicKey,
        viewingPrivateKey,
        includeList: [fromAddressToTest],
        excludeList: [fromAddressToTest],
      });

    expect(includeAndExcludeListResults.length).toBe(0);
  });

  test('efficiently processes a large number of announcements', async () => {
    // Generate a large set of mock announcements using the first announcement from above
    const largeNumberOfAnnouncements = 1000; // Example size
    const largeAnnouncements = Array.from(
      { length: largeNumberOfAnnouncements },
      () => announcements[0]
    );

    const startTime = performance.now();

    const results = await stealthClient.getAnnouncementsForUser({
      announcements: largeAnnouncements,
      spendingPublicKey,
      viewingPrivateKey,
    });

    const endTime = performance.now();

    // Verify the function handles large data sets correctly
    expect(results).toHaveLength(largeNumberOfAnnouncements);
    console.log(
      `Processed ${largeNumberOfAnnouncements} announcements in ${endTime - startTime} milliseconds.`
    );
  });
});
