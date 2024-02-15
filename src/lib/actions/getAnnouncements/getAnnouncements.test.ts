import { describe, test, expect } from 'bun:test';
import ERC556AnnouncerAbi from '../../abi/ERC5564Announcer';
import {
  ANNOUNCER_CONTRACTS,
  VALID_SCHEME_ID,
  createStealthClient,
  generateStealthAddress,
} from '../../..';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const setupWallet = () => {
  const account = privateKeyToAccount(
    process.env.TEST_PRIVATE_KEY as `0x${string}`
  );

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL!),
  });

  return walletClient;
};

describe('getAnnouncements', async () => {
  const stealthMetaAddressReceiver =
    'st:eth:0x020c828476b87a4d391f8b4b98de012125adb5be021a2dc6761cd6265219d901e203860c009a2c71de2a4abdf892804d52d56770599d6407bbdac77c311be98bd7e7';

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const ERC5564_CONTRACT_DEPLOY_BLOCK = BigInt(5281643);
  const fromBlock = BigInt(ERC5564_CONTRACT_DEPLOY_BLOCK);
  const CHAIN_ID = 11155111; // Sepolia
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const ERC5564Address = ANNOUNCER_CONTRACTS.get(CHAIN_ID)!;
  const stealthClient = createStealthClient({ rpcUrl, chainId: CHAIN_ID });

  const walletClient = setupWallet();

  // Setup stealth address details
  const { stealthAddress, viewTag, ephemeralPublicKey } =
    generateStealthAddress({
      stealthMetaAddressURI: stealthMetaAddressReceiver,
      schemeId,
    });

  console.log('stealthAddress:', stealthAddress);
  console.log('ephemeralPublicKey:', ephemeralPublicKey);
  console.log('viewTag:', viewTag);

  // announce the stealth address, ephemeral public key, and view tag
  await walletClient.writeContract({
    address: ANNOUNCER_CONTRACTS.get(11155111)!,
    functionName: 'announce',
    args: [BigInt(schemeId), stealthAddress, ephemeralPublicKey, viewTag],
    abi: ERC556AnnouncerAbi,
  });

  test('fetches announcements successfully', async () => {
    const announcements = await stealthClient.getAnnouncements({
      ERC5564Address: ERC5564Address,
      args: {},
      fromBlock,
    });

    expect(announcements).toBeDefined();
    expect(announcements.length).toBeGreaterThan(0);
  });

  test('fetches specific announcement successfully using stealth address', async () => {
    const announcements = await stealthClient.getAnnouncements({
      ERC5564Address: ERC5564Address,
      args: {
        stealthAddress: stealthAddress,
      },
      fromBlock,
    });

    expect(announcements[0].stealthAddress).toBe(stealthAddress);
  });
});
