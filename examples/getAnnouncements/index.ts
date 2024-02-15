import {
  ANNOUNCER_CONTRACTS,
  VALID_SCHEME_ID,
  createStealthClient,
  getAnnouncements,
} from 'stealth-address-sdk';

// Example parameters
const chainId = 11155111; // Example chain ID for Sepolia
const rpcUrl = 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID';

// Initialize the stealth client
const stealthClient = createStealthClient({ chainId, rpcUrl });

// Use the address of your calling contract if applicable
const CALLER = '0xYourCallingContractAddress';

// Example stealth address
const stealthAddress = '0xYourStealthAddress';

async function fetchAnnouncements() {
  // The contract address of the ERC5564Announcer on your target blockchain
  // You can use the provided ANNOUNCER_CONTRACTS map to get the singleton contract address for a valid chain ID
  const ERC5564Address = ANNOUNCER_CONTRACTS.get(chainId);

  if (!ERC5564Address) {
    throw new Error('No contract found: invalid chain ID');
  }

  // Example call to getAnnouncements action on the stealth client
  // Adjust parameters according to your requirements
  const announcements = await stealthClient.getAnnouncements({
    ERC5564Address,
    args: {
      schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1),
      caller: CALLER,
      // Additional args for filtering, if necessary
      // fromBlock: '0x0',
      // toBlock: 'latest',
    },
  });

  // Alternatively, you can use the getAnnouncements function directly
  const otherAnnouncements = await getAnnouncements({
    // pass in the rpcUrl and chainId to clientParams
    clientParams: { rpcUrl, chainId },
    ERC5564Address,
    args: {
      schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1),
      caller: CALLER,
      stealthAddress,
    },
  });

  console.log('Fetched announcements:', announcements);
}

fetchAnnouncements().catch(console.error);
