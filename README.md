# Stealth Address SDK

This TypeScript SDK provides tools for working with Ethereum stealth addresses as defined in [EIP-5564](https://eips.ethereum.org/EIPS/eip-5564). It aims to offer a comprehensive suite of functionalities for both generating stealth addresses and interacting with stealth transactions.

## Features

- Generate Ethereum stealth addresses.
- Compute stealth address private keys.
- Check stealth address announcements to determine if they are intended for a specific user.
- (Planned) More features to fully support ERC-5564 interactions.

## Installation

```bash
npm install stealth-address-sdk
# or
yarn add stealth-address-sdk
# or
bun install stealth-address-sdk
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

## License

[MIT](/LICENSE) License
