import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Address } from 'viem';
import {
  type AnnouncementLog,
  ERC5564AnnouncerAbi,
  VALID_SCHEME_ID,
  generateStealthAddress
} from '../../..';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../helpers/types';
import type { StealthActions } from '../../stealthClient/types';

const NUM_ANNOUNCEMENTS = 3;
const WATCH_POLLING_INTERVAL = 1000;

type WriteAnnounceArgs = {
  schemeId: bigint;
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
};

const announce = async ({
  walletClient,
  ERC5564Address,
  args
}: {
  walletClient: SuperWalletClient;
  ERC5564Address: Address;
  args: WriteAnnounceArgs;
}) => {
  if (!walletClient.account) throw new Error('No account found');

  // Write to the announcement contract
  const hash = await walletClient.writeContract({
    address: ERC5564Address,
    functionName: 'announce',
    args: [
      args.schemeId,
      args.stealthAddress,
      args.ephemeralPublicKey,
      args.viewTag
    ],
    abi: ERC5564AnnouncerAbi,
    chain: walletClient.chain,
    account: walletClient.account
  });

  // Wait for the transaction receipt
  await walletClient.waitForTransactionReceipt({
    hash
  });

  return hash;
};

// Delay to wait for the announcements to be watched in accordance with the polling interval
const delay = async () =>
  await new Promise(resolve => setTimeout(resolve, WATCH_POLLING_INTERVAL * 2));

describe('watchAnnouncementsForUser', () => {
  let stealthClient: StealthActions;
  let walletClient: SuperWalletClient;
  let ERC5564Address: Address;

  // Set up keys
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const schemeIdBigInt = BigInt(schemeId);
  const { spendingPublicKey, viewingPrivateKey, stealthMetaAddressURI } =
    setupTestStealthKeys(schemeId);

  // Track the new announcements to see if they are being watched
  const newAnnouncements: AnnouncementLog[] = [];
  let unwatch: () => void;

  beforeAll(async () => {
    // Set up the testing environment
    ({ stealthClient, ERC5564Address } = await setupTestEnv());
    walletClient = await setupTestWallet();

    // Set up watching announcements for a user
    unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address // Watch announcements for the user, who is also the caller here as an example
      },
      handleLogsForUser: logs => {
        // Add the new announcements to the list
        // Should be just one log for each call of the announce function
        for (const log of logs) {
          newAnnouncements.push(log);
        }
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL // Override the default polling interval for testing
      }
    });

    // Set up the stealth address to announce
    const { stealthAddress, ephemeralPublicKey, viewTag } =
      generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

    // Sequentially announce NUM_ACCOUNCEMENT times
    for (let i = 0; i < NUM_ANNOUNCEMENTS; i++) {
      await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress,
          ephemeralPublicKey,
          viewTag
        }
      });
    }

    // Small wait to let the announcements be watched
    await delay();
  });

  afterAll(() => {
    unwatch();
  });

  test('should watch announcements for a user', () => {
    // Check if the announcements were watched
    // There should be NUM_ACCOUNCEMENTS announcements because there were NUM_ANNOUNCEMENTS calls to the announce function
    expect(newAnnouncements.length).toEqual(NUM_ANNOUNCEMENTS);
  });

  test('should correctly not update announcements for a user if announcement does not apply to user', async () => {
    // Announce again, but arbitrarily (just as an example/for testing) change the ephemeral public key,
    // so that the announcement does not apply to the user, and is not watched
    const { stealthAddress, ephemeralPublicKey, viewTag } =
      generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

    const incrementLastCharOfHexString = (hexStr: `0x${string}`) => {
      const lastChar = hexStr.slice(-1);
      const base = '0123456789abcdef';
      const index = base.indexOf(lastChar.toLowerCase());
      const newLastChar = index === 15 ? '0' : base[index + 1]; // Roll over from 'f' to '0'
      return `0x${hexStr.slice(2, -1) + newLastChar}` as `0x${string}`;
    };

    // Replace the last character of ephemeralPublicKey with a different character for testing
    const newEphemeralPublicKey =
      incrementLastCharOfHexString(ephemeralPublicKey);

    // Write to the announcement contract with an inaccurate ephemeral public key
    await announce({
      walletClient,
      ERC5564Address,
      args: {
        schemeId: BigInt(schemeId),
        stealthAddress,
        ephemeralPublicKey: newEphemeralPublicKey,
        viewTag
      }
    });

    await delay();

    // Expect no change in the number of announcements watched
    expect(newAnnouncements.length).toEqual(NUM_ANNOUNCEMENTS);
  });
});
