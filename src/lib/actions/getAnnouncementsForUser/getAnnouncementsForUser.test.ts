import { expect, test, describe, beforeAll } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import { VALID_SCHEME_ID, generateStealthAddress } from '../../../utils/crypto';
import { ERC5564AnnouncerAbi } from '../../abi';
import type { AnnouncementLog } from '..';
import { FromValueNotFoundError, TransactionHashRequiredError } from './types';
import {
  getTransactionFrom,
  processAnnouncement,
} from './getAnnouncementsForUser';
import { type PublicClient } from 'viem';
import { getViewTagFromMetadata } from '../../..';
import type { HexString } from '../../../utils/crypto/types';
import type { StealthActions } from '../../stealthClient/types';
import type { SuperWalletClient } from '../../helpers/types';

describe('getAnnouncementsForUser', () => {
  let stealthClient: StealthActions;
  let walletClient: SuperWalletClient;

  let stealthAddress: HexString,
    ephemeralPublicKey: HexString,
    viewTag: HexString;
  let spendingPublicKey: HexString,
    viewingPrivateKey: HexString,
    stealthMetaAddressURI: string;

  let announcements: AnnouncementLog[] = [];

  beforeAll(async () => {
    // Set up the test environment
    const {
      stealthClient: client,
      ERC5564Address,
      ERC5564DeployBlock,
    } = await setupTestEnv();
    walletClient = await setupTestWallet();
    stealthClient = client;

    // Set up the stealth keys and generate a stealth address
    const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
    ({ stealthMetaAddressURI, spendingPublicKey, viewingPrivateKey } =
      setupTestStealthKeys(schemeId));

    ({ stealthAddress, ephemeralPublicKey, viewTag } = generateStealthAddress({
      stealthMetaAddressURI,
      schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
    }));

    // Announce the stealth address, ephemeral public key, and view tag
    const hash = await walletClient.writeContract({
      address: ERC5564Address,
      functionName: 'announce',
      args: [BigInt(schemeId), stealthAddress, ephemeralPublicKey, viewTag],
      abi: ERC5564AnnouncerAbi,
      chain: walletClient.chain,
      account: walletClient.account!,
    });

    // Wait for the transaction to be mined
    await walletClient.waitForTransactionReceipt({
      hash,
    });

    // Fetch relevant announcements to check against
    announcements = await stealthClient.getAnnouncements({
      ERC5564Address,
      args: {
        schemeId: BigInt(schemeId),
        stealthAddress,
        caller: walletClient.account?.address, // Just an example; the caller is the address of the wallet since it called announce
      },
      fromBlock: ERC5564DeployBlock,
      toBlock: 'latest',
    });
  });

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

  test('throws TransactionHashRequiredError when transactionHash is null', async () => {
    const announcementWithoutHash: AnnouncementLog = {
      ...announcements[0],
      transactionHash: null,
    };

    expect(
      processAnnouncement(
        announcementWithoutHash,
        walletClient as PublicClient,
        {
          spendingPublicKey,
          viewingPrivateKey,
          excludeList: new Set([]),
          includeList: new Set([]),
        }
      )
    ).rejects.toBeInstanceOf(TransactionHashRequiredError);
  });

  test('throws FromValueNotFoundError when the "from" value is not found', async () => {
    const invalidHash = '0xinvalidhash';

    expect(
      getTransactionFrom({
        publicClient: walletClient as PublicClient,
        hash: invalidHash,
      })
    ).rejects.toBeInstanceOf(FromValueNotFoundError);
  });

  test('throws error if view tag does not start with 0x', () => {
    const metadata = 'invalidmetadata';
    expect(() => getViewTagFromMetadata(metadata as HexString)).toThrow(
      'Invalid metadata format'
    );
  });
});

describe('getAnnouncementsForUser error class tests', () => {
  test('TransactionHashRequiredError should have the correct message', () => {
    const errorMessage = 'The transaction hash is required.';
    const error = new TransactionHashRequiredError();

    expect(error.message).toBe(errorMessage);
    expect(error.name).toBe('TransactionHashRequiredError');
  });

  test('FromValueNotFoundError should have the correct message', () => {
    const errorMessage =
      'The "from" value could not be retrieved for a transaction.';
    const error = new FromValueNotFoundError();

    expect(error.message).toBe(errorMessage);
    expect(error.name).toBe('FromValueNotFoundError');
  });
});
