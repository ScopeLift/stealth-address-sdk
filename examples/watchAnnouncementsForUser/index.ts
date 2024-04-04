import {
  ERC5564_CONTRACT,
  VALID_SCHEME_ID,
} from "@scopelift/stealth-address-sdk";

// Initialize your environment variables or configuration
const chainId = 11155111; // Example chain ID
const rpcUrl = process.env.RPC_URL; // Your Ethereum RPC URL
if (!rpcUrl) throw new Error("Missing RPC_URL environment variable");

// User's keys and stealth address details
const spendingPublicKey = "0xUserSpendingPublicKey";
const viewingPrivateKey = "0xUserViewingPrivateKey";

// The contract address of the ERC5564Announcer on your target blockchain
// You can use the provided ERC5564_CONTRACT enum to get the singleton contract address for a valid chain ID
const ERC5564Address = ERC5564_CONTRACT.SEPOLIA;

// Initialize the stealth client with your configuration
const stealthClient = createStealthClient({ chainId, rpcUrl });

// Watch for announcements for the user
const unwatch = await stealthClient.watchAnnouncementsForUser({
  ERC5564Address,
  args: {
    schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1), // Your scheme ID
    caller: "0xYourCallingContractAddress", // Use the address of your calling contract if applicable
  },
  spendingPublicKey,
  viewingPrivateKey,
  handleLogsForUser: (logs) => {
    console.log(logs);
  }, // Your callback function to handle incoming logs
});

// Stop watching for announcements
unwatch();
