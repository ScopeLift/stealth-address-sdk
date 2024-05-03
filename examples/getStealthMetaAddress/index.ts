import {
  ERC6538_CONTRACT,
  VALID_SCHEME_ID,
  createStealthClient,
  getStealthMetaAddress
} from '@scopelift/stealth-address-sdk';

// Example stealth client parameters
const chainId = 11155111; // Example chain ID for Sepolia
const rpcUrl = process.env.RPC_URL; // Use your env rpc url that aligns with the chainId;
if (!rpcUrl) throw new Error('Missing RPC_URL environment variable');

// Initialize the stealth client
const stealthClient = createStealthClient({ chainId, rpcUrl });

// Example getting the singleton registry contract address for Sepolia
const ERC6538Address = ERC6538_CONTRACT.SEPOLIA;

// Example registrant
const registrant = '0xYourRegistrantAddress'; // can also be an ens name

// Example getting a valid scheme id
const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;

const stealthMetaAddress = await stealthClient.getStealthMetaAddress({
  ERC6538Address,
  registrant,
  schemeId
});

// Alternatively, you can use the getStealthMetaAddress function directly
await getStealthMetaAddress({
  // pass in the rpcUrl and chainId to clientParams
  clientParams: { rpcUrl, chainId },
  ERC6538Address,
  registrant,
  schemeId
});
