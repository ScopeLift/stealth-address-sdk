import { describe, test, expect, mock, afterEach } from 'bun:test';
import ERC556AnnouncerAbi from '../../abi/ERC5564Announcer';
import {
  VALID_SCHEME_ID,
  generateRandomStealthMetaAddress,
  generateStealthAddress,
} from '../../..';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';

describe('getAnnouncements', async () => {
  const { stealthClient, ERC5564DeployBlock, ERC5564Address } =
    await setupTestEnv();
  const walletClient = await setupTestWallet();

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddressURI } = generateRandomStealthMetaAddress();
  const fromBlock = ERC5564DeployBlock;

  // Set up stealth address details
  const { stealthAddress, viewTag, ephemeralPublicKey } =
    generateStealthAddress({
      stealthMetaAddressURI,
      schemeId,
    });

  // Announce the stealth address, ephemeral public key, and view tag
  const hash = await walletClient.writeContract({
    address: ERC5564Address,
    functionName: 'announce',
    args: [BigInt(schemeId), stealthAddress, ephemeralPublicKey, viewTag],
    abi: ERC556AnnouncerAbi,
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  console.log('Waiting for announcement transaction to be mined...');
  // Wait for the transaction to be mined
  const res = await walletClient.waitForTransactionReceipt({
    hash,
  });
  console.log('Announcement transaction mined:', res.transactionHash);

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
