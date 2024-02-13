# Stealth Address SDK

This TypeScript SDK provides tools for working with Ethereum stealth addresses as defined in [EIP-5564](https://eips.ethereum.org/EIPS/eip-5564). It aims to offer a comprehensive suite of functionalities for both generating stealth addresses and interacting with stealth transactions.

The current version only allows for stealth address generation, **which is a work in progress and not suitable for production**.

## Features

- Generate Ethereum stealth addresses.
- Compute stealth address private keys.
- Check stealth address announcements.
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

import { generateStealthAddress } from 'stealth-address-sdk';

// Your stealth meta-address URI  
// Follows the format: "st:\<chain\>:\<stealthMetaAddress\>", where \<chain\> is the [chain identifier](https://eips.ethereum.org/EIPS/eip-3770#examples) ([examples](https://github.com/ethereum-lists/chains)) and <stealthMetaAddress> is the stealth meta-address.  
const stealthMetaAddressURI = '...';

// Generate a stealth address using the default scheme (1)  
// To learn more about the initial implementation scheme using SECP256k1, please see the reference [here](https://eips.ethereum.org/EIPS/eip-5564)  
const result = generateStealthAddress({ stealthMetaAddressURI });

// Use the stealth address  
console.log(result.stealthAddress);
