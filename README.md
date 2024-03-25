# Stealth Address SDK

This TypeScript SDK provides tools for working with Ethereum stealth addresses as defined in [EIP-5564](https://eips.ethereum.org/EIPS/eip-5564) and [EIP-6538](https://eips.ethereum.org/EIPS/eip-6538). It aims to offer a comprehensive suite of functionalities for both generating stealth addresses and interacting with stealth transactions.

## Features

- Generate Ethereum stealth addresses.
- Compute stealth address private keys.
- Check stealth address announcements to determine if they are intended for a specific user.
- Look up the stealth meta address for a registrant
- Fetch announcements
- Watch announcements for a user
- Prepare the payload for announcing stealth address details

## Installation

```bash
npm install stealth-address-sdk
# or
yarn add stealth-address-sdk
# or
bun install stealth-address-sdk
```

## Testing

Tests default to using your local [anvil](https://book.getfoundry.sh/anvil/) node

```bash
anvil
bun run test
```

Alternatively, run your tests using a fork of your provided (`RPC_URL` in `env`) rpc url

```bash
bun run anvil-fork
# run all tests
bun run test-fork
# or for a specific file
bun run test-fork FILE={file path}
```

## Quick Start

### Generating a Stealth Address

```ts
import { generateStealthAddress } from 'stealth-address-sdk';

// Your stealth meta-address URI
// Follows the format: "st:<chain>:<stealthMetaAddress>", where <chain> is the chain identifier (https://eips.ethereum.org/EIPS/eip-3770#examples) and <stealthMetaAddress> is the stealth meta-address.
const stealthMetaAddressURI = '...';

// Generate a stealth address using the default scheme (1)
// To learn more about the initial implementation scheme using SECP256k1, please see the reference here (https://eips.ethereum.org/EIPS/eip-5564)
const result = generateStealthAddress({ stealthMetaAddressURI });

// Use the stealth address
console.log(result.stealthAddress);
```

### Computing Stealh Key

```ts
import { computeStealthKey, VALID_SCHEME_ID } from 'stealth-address-sdk';

// Example inputs
const viewingPrivateKey = '0x...'; // Viewing private key of the recipient
const spendingPrivateKey = '0x...'; // Spending private key of the recipient
const ephemeralPublicKey = '0x...'; // Ephemeral public key from the sender's announcement
const schemeId = VALID_SCHEME_ID.SCHEME_ID_1; // Scheme ID, currently only '1' is supported

// Compute the stealth private key
const stealthPrivateKey = computeStealthKey({
  viewingPrivateKey,
  spendingPrivateKey,
  ephemeralPublicKey,
  schemeId,
});
```

### Checking Stealth Address Announcements

```ts
import { checkStealthAddress, VALID_SCHEME_ID } from 'stealth-address-sdk';

// Example inputs
const ephemeralPublicKey = '0x...'; // The ephemeral public key from the announcement
const spendingPublicKey = '0x...'; // The user's spending public key
const userStealthAddress = '0x...'; // The user's stealth address
const viewingPrivateKey = '0x...'; // The user's viewing private key
const viewTag = '0x...'; // The view tag from the announcement
const schemeId = VALID_SCHEME_ID.SCHEME_ID_1; // Scheme ID, currently only '1' is supported

// Check if the announcement is intended for the user
const isForUser = checkStealthAddress({
  ephemeralPublicKey,
  schemeId,
  spendingPublicKey,
  userStealthAddress,
  viewingPrivateKey,
  viewTag,
});

console.log(
  isForUser
    ? 'Announcement is for the user'
    : 'Announcement is not for the user'
);
```

### Fetching announcements, and checking if the associated stealth address is for the user

```ts
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
  });

  // Example call to getAnnouncementsForUser action on the stealth client
  // Adjust parameters according to your requirements
  const userAnnouncements = await stealthClient.getAnnouncementsForUser({
    announcements,
    spendingPublicKey: '0xUserSpendingPublicKey',
    viewingPrivateKey: '0xUserViewingPrivateKey',
  });

  return userAnnouncements;
}
```

## License

[MIT](/LICENSE) License
