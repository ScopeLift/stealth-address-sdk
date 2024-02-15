import { describe, test, expect } from 'bun:test';
import { getAnnouncements } from '..';
import ERC556AnnouncerAbi from '../../abi/ERC5564Announcer';
import {
  ANNOUNCER_CONTRACTS,
  VALID_SCHEME_ID,
  generateStealthAddress,
} from '../../..';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

describe('getAnnouncements', async () => {
  const senderAddress = '0xf0d7B8740D8850e5d723e9d205Bd55F9fA097B78';
  const stealthMetaAddressSender =
    'st:eth:0x030270de2edfd90da88466a358bf2575d54a1354f46528773ebf9e0883bde8e433027c2ef0254db6320fbe122fe9eebb1bd845d1abae452e1c4baef5370017841a7c';
  const stealthMetaAddressReceiver =
    'st:eth:0x020c828476b87a4d391f8b4b98de012125adb5be021a2dc6761cd6265219d901e203860c009a2c71de2a4abdf892804d52d56770599d6407bbdac77c311be98bd7e7';

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const ERC5564_CONTRACT_DEPLOY_BLOCK = BigInt(5281643);

  // Setup
  const { stealthAddress, viewTag, ephemeralPublicKey } =
    generateStealthAddress({
      stealthMetaAddressURI: stealthMetaAddressReceiver,
      schemeId,
    });

  const account = privateKeyToAccount(
    process.env.TEST_PRIVATE_KEY as `0x${string}`
  );
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL!),
  });

  console.log('account:', await walletClient.getAddresses());
  console.log('stealthAddress:', stealthAddress);

  // write to contract
  walletClient.writeContract({
    address: ANNOUNCER_CONTRACTS.get(11155111)!,
    functionName: 'announce',
    args: [BigInt(schemeId), stealthAddress, ephemeralPublicKey, viewTag],
    abi: ERC556AnnouncerAbi,
  });

  test('fetches announcements successfully', async () => {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const chainId = 11155111; // Sepolia
    const ERC5564Address = ANNOUNCER_CONTRACTS.get(chainId);

    const announcements = await getAnnouncements({
      clientParams: { rpcUrl: rpcUrl!, chainId },
      ERC5564Address: ERC5564Address!,
      args: {},
      fromBlock: BigInt(ERC5564_CONTRACT_DEPLOY_BLOCK),
    });

    // Assert
    expect(announcements).toBeDefined();
    // expect(announcements.length).toBeGreaterThan(0);
    console.log('Fetched announcements:', announcements);
  });
});
