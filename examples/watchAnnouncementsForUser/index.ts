import {
  type AnnouncementLog,
  ERC5564_CONTRACT_ADDRESS,
  VALID_SCHEME_ID,
  createStealthClient
} from '@scopelift/stealth-address-sdk';

const chainId = Number.parseInt(process.env.CHAIN_ID ?? '84532', 10);
const rpcUrl = process.env.RPC_URL; // Your Ethereum RPC URL
if (!rpcUrl) throw new Error('Missing RPC_URL environment variable');

const spendingPublicKey = process.env.SPENDING_PUBLIC_KEY as `0x${string}`;
if (!spendingPublicKey) {
  throw new Error('Missing SPENDING_PUBLIC_KEY environment variable');
}

const viewingPrivateKey = process.env.VIEWING_PRIVATE_KEY as `0x${string}`;
if (!viewingPrivateKey) {
  throw new Error('Missing VIEWING_PRIVATE_KEY environment variable');
}

const caller = process.env.CALLER as `0x${string}` | undefined;
const fromBlockEnv = process.env.FROM_BLOCK;
const fromBlock = fromBlockEnv ? BigInt(fromBlockEnv) : undefined;

// The contract address of the ERC5564Announcer on your target blockchain
// You can use the provided ERC5564_CONTRACT_ADDRESS get the singleton contract address for a valid chain ID
const ERC5564Address = ERC5564_CONTRACT_ADDRESS;

// Initialize the stealth client with your configuration
const stealthClient = createStealthClient({ chainId, rpcUrl });

// Watch for announcements for the user
const unwatch = await stealthClient.watchAnnouncementsForUser({
  ERC5564Address,
  args: {
    schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1),
    ...(caller ? { caller } : {})
  },
  ...(fromBlock === undefined ? {} : { fromBlock }),
  spendingPublicKey,
  viewingPrivateKey,
  handleLogsForUser: async (logs: AnnouncementLog[]) => {
    console.log(logs);
  },
  onError: (error: Error) => {
    console.error('watchAnnouncementsForUser failed to process a batch', error);
  }
});

console.log('Watching for announcements. Press Ctrl+C to stop.');

await new Promise<void>(resolve => {
  const stopWatching = () => {
    unwatch();
    process.off('SIGINT', stopWatching);
    process.off('SIGTERM', stopWatching);
    resolve();
  };

  process.once('SIGINT', stopWatching);
  process.once('SIGTERM', stopWatching);
});
