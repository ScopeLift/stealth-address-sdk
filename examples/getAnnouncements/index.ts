import {
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

// The contract address of the ERC5564Announcer on your target blockchain
const IERC5564_ADDRESS = '0xContractAddressOfERC5564Announcer';

// Example stealth address
const stealthAddress = '0xYourStealthAddress';

async function fetchAnnouncements() {
  // Example call to getAnnouncements action on the stealth client
  // Adjust parameters according to your requirements
  const announcements = await stealthClient.getAnnouncements({
    IERC5564Address: IERC5564_ADDRESS,
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
    IERC5564Address: IERC5564_ADDRESS,
    args: {
      schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1),
      caller: CALLER,
      stealthAddress,
    },
  });

  console.log('Fetched announcements:', announcements);
}

fetchAnnouncements().catch(console.error);
