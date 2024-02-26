import { describe, test, expect, afterAll, beforeAll } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import {
  type AnnouncementArgs,
  type AnnouncementLog,
  ERC5564AnnouncerAbi,
  VALID_SCHEME_ID,
  generateStealthAddress,
} from '../../..';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';

describe('watchAnnouncementsForUser', async () => {
  const { stealthClient, ERC5564Address } = setupTestEnv();
  const walletClient = setupTestWallet();
  const { spendingPublicKey, viewingPrivateKey, stealthMetaAddressURI } =
    setupTestStealthKeys();
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;

  // Track the new announcements to see if they are being watched
  let newAnnouncements: AnnouncementLog[] = [];
  let unwatch: () => void;
  const pollingInterval = 1000; // Override the default polling interval for testing

  beforeAll(async () => {
    // Set up watching announcements for a user
    const watchArgs: AnnouncementArgs = {
      schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1),
      caller: walletClient.account?.address,
    };

    unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: watchArgs,
      handleLogsForUser: logs => {
        // Add the new announcements to the list
        // Should be just one log for each call of the announce function
        logs.forEach(log => {
          newAnnouncements.push(log);
        });
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: { pollingInterval },
    });

    // Sequentially announce 3 times
    for (let i = 0; i < 3; i++) {
      await announce();
    }

    // Delay to wait for the announcements to be watched in accordance with the polling interval
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(() => {
    unwatch();
  });

  // Set up and emit announcement for specific stealth address details
  const announce = async () => {
    console.log('Announcing...');

    // Set up stealth address details
    const { stealthAddress, ephemeralPublicKey, viewTag } =
      generateStealthAddress({
        stealthMetaAddressURI,
        schemeId,
      });

    // Write to the announcement contract
    const hash = await walletClient.writeContract({
      address: ERC5564Address,
      functionName: 'announce',
      args: [BigInt(schemeId), stealthAddress, ephemeralPublicKey, viewTag],
      abi: ERC5564AnnouncerAbi,
      chain: walletClient.chain,
      account: walletClient.account!,
    });

    console.log('Waiting for announcement transaction to be mined...');

    const res = await walletClient.waitForTransactionReceipt({
      hash,
    });

    console.log('Announcement transaction mined:', res.transactionHash);
    return hash;
  };

  test('should watch announcements for a user', () => {
    console.log('new announcements:', newAnnouncements);

    // Check if the announcements were watched
    // There should be 3 announcements because there were 3 calls to the announce function
    expect(newAnnouncements.length).toEqual(3);
  });
});
