import {
  ERC5564_CONTRACT,
  VALID_SCHEME_ID,
  createStealthClient,
} from 'stealth-address-sdk';

// Example parameters
const chainId = 11155111; // Example chain ID for Sepolia
const rpcUrl = process.env.RPC_URL; // Your env rpc url that aligns with the chainId;
const fromBlock = BigInt(12345678); // Example ERC5564 announcer contract deploy block for Sepolia, or the block in which the user registered their stealth meta address (as an example)

// Initialize the stealth client
const stealthClient = createStealthClient({ chainId, rpcUrl: rpcUrl! });

// Use the address of your calling contract if applicable
const caller = '0xYourCallingContractAddress';

// Your scheme id
const schemeId = BigInt(VALID_SCHEME_ID.SCHEME_ID_1);

// The contract address of the ERC5564Announcer on your target blockchain
// You can use the provided ERC5564_CONTRACT enum to get the singleton contract address for a valid chain ID
const ERC5564Address = ERC5564_CONTRACT.SEPOLIA; // only for Sepolia for now

async function fetchAnnouncementsForUser() {
  // Example call to getAnnouncements action on the stealth client to get all potential announcements
  // Use your preferred method to get announcements if different, and
  // adjust parameters according to your requirements
  const announcements = await stealthClient.getAnnouncements({
    ERC5564Address,
    args: {
      schemeId,
      caller,
      // Additional args for filtering, if necessary
    },
    fromBlock, // Optional fromBlock parameter (defaults to 0, which can be slow for many blocks)
    toBlock: 'latest', // Optional toBlock parameter (defaults to latest)
  });

  // Example call to getAnnouncementsForUser action on the stealth client
  // Adjust parameters according to your requirements
  const userAnnouncements = await stealthClient.getAnnouncementsForUser({
    announcements,
    spendingPublicKey: '0xUserSpendingPublicKey',
    viewingPrivateKey: '0xUserViewingPrivateKey',
    includeList: ['0xSomeEthAddress, 0xSomeOtherEthAddress'], // Optional include list to only include announcements for specific "from" addresses
    excludeList: ['0xEthAddressToExclude'], // Optional exclude list to exclude announcements for specific "from" addresses
  });

  return userAnnouncements;
}

fetchAnnouncementsForUser().catch(console.error);
