import {
  ERC5564_CONTRACT,
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
const caller = '0xYourCallingContractAddress';

// Example stealth address
const stealthAddress = '0xYourStealthAddress';

// Your scheme id
const schemeId = BigInt(VALID_SCHEME_ID.SCHEME_ID_1);

async function fetchAnnouncements() {
  // The contract address of the ERC5564Announcer on your target blockchain
  // You can use the provided ERC5564_CONTRACT enum to get the singleton contract address for a valid chain ID
  const ERC5564Address = ERC5564_CONTRACT.SEPOLIA; // only for Sepolia for now

  // Example call to getAnnouncements action on the stealth client
  // Adjust parameters according to your requirements
  const announcements = await stealthClient.getAnnouncements({
    ERC5564Address,
    args: {
      schemeId,
      caller,
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
      schemeId,
      caller,
      stealthAddress,
    },
  });

  console.log('Fetched announcements:', announcements);
}

fetchAnnouncements().catch(console.error);
