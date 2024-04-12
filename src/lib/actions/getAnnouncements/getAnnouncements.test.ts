import { describe, test, expect, mock, afterEach, beforeAll } from 'bun:test';
import ERC556AnnouncerAbi from '../../abi/ERC5564Announcer';
import {
  VALID_SCHEME_ID,
  generateRandomStealthMetaAddress,
  generateStealthAddress,
} from '../../..';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import type { StealthActions } from '../../stealthClient/types';
import type { SuperWalletClient } from '../../helpers/types';
import type { Address } from 'viem';

describe('getAnnouncements', () => {
  let stealthClient: StealthActions;
  let walletClient: SuperWalletClient;
  let fromBlock: bigint;
  let ERC5564Address: Address;

  // Set up stealth address details
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddressURI } = generateRandomStealthMetaAddress();
  const { stealthAddress, viewTag, ephemeralPublicKey } =
    generateStealthAddress({
      stealthMetaAddressURI,
      schemeId,
    });

  // Set up the test environment and announce the stealth address
  beforeAll(async () => {
    const {
      stealthClient: client,
      ERC5564Address,
      ERC5564DeployBlock,
    } = await setupTestEnv();
    walletClient = await setupTestWallet();
    stealthClient = client;
    fromBlock = ERC5564DeployBlock;

    // Announce the stealth address, ephemeral public key, and view tag
    const hash = await walletClient.writeContract({
      address: ERC5564Address,
      functionName: 'announce',
      args: [BigInt(schemeId), stealthAddress, ephemeralPublicKey, viewTag],
      abi: ERC556AnnouncerAbi,
      chain: walletClient.chain,
      account: walletClient.account!,
    });

    // Wait for the transaction to be mined
    await walletClient.waitForTransactionReceipt({
      hash,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test('fetches announcements successfully', async () => {
    const announcements = await stealthClient.getAnnouncements({
      ERC5564Address,
      args: {},
      fromBlock,
    });

    expect(announcements.length).toBeGreaterThan(0);
  });

  test('fetches specific announcement successfully using stealth address', async () => {
    const announcements = await stealthClient.getAnnouncements({
      ERC5564Address,
      args: {
        stealthAddress,
      },
      fromBlock,
    });

    expect(announcements[0].stealthAddress).toBe(stealthAddress);
  });
  test('fetches specific announcements successfully using caller', async () => {
    const announcements = await stealthClient.getAnnouncements({
      ERC5564Address,
      args: {
        caller: walletClient.account?.address,
      },
      fromBlock,
    });

    expect(announcements[0].caller).toBe(walletClient.account?.address!);
  });

  test('fetches specific announcements successfully using schemeId', async () => {
    const announcements = await stealthClient.getAnnouncements({
      ERC5564Address,
      args: {
        schemeId: BigInt(schemeId),
      },
      fromBlock,
    });

    expect(announcements[0].schemeId).toBe(BigInt(schemeId));

    const invalidSchemeId = BigInt('2');

    const invalidAnnouncements = await stealthClient.getAnnouncements({
      ERC5564Address,
      args: {
        schemeId: invalidSchemeId,
      },
      fromBlock,
    });

    expect(invalidAnnouncements.length).toBe(0);
  });
});
