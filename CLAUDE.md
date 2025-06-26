# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Testing
- `bun test` - Run all tests using local Bun test runner
- `bun test --watch src` - Run tests in watch mode during development
- `bun test src/path/to/specific.test.ts` - Run a specific test file
- `anvil` - Start local Anvil node for testing (required for most tests)
- `bun run anvil-fork` - Start Anvil with fork of provided RPC_URL
- `bun run test-fork` - Run tests against forked network
- `bun run test-fork FILE=src/path/to/test.ts` - Run specific test against fork

### Building and Linting
- `bun run build` - Apply Biome linting fixes and compile TypeScript
- `bun run check` - Run Biome linting checks without fixing
- `biome check --apply .` - Apply Biome formatting and linting fixes
- `bun tsc` - Run TypeScript compiler

### Publishing
- `bun run publish` - Build and publish to npm

## Architecture Overview

### Core Structure
This is a TypeScript SDK for Ethereum stealth addresses implementing EIP-5564 and EIP-6538. The codebase is organized into several key layers:

**Entry Points (`src/index.ts`)**:
- Exports all utilities, client actions, configuration, and types
- Main exports: crypto utilities, helpers, stealth client, contract addresses

**Stealth Client (`src/lib/stealthClient/`)**:
- `createStealthClient()` - Primary factory function for client instances
- Takes `chainId` and `rpcUrl` parameters, returns initialized action functions
- Uses Viem's `PublicClient` internally for blockchain interactions
- All client actions are pre-bound with the public client instance

**Actions (`src/lib/actions/`)**:
- Modular blockchain interaction functions organized by domain
- Each action has its own directory with implementation, types, and tests
- Key actions: `getAnnouncements`, `getStealthMetaAddress`, `prepareAnnounce`, etc.
- Actions work with or without the stealth client (can accept raw `PublicClient`)

**Crypto Utilities (`src/utils/crypto/`)**:
- Pure functions for stealth address cryptography
- Core functions: `generateStealthAddress`, `computeStealthKey`, `checkStealthAddress`
- Uses `@noble/secp256k1` for elliptic curve operations
- All functions return consistent types and handle errors gracefully

**Helper Utilities (`src/utils/helpers/`)**:
- Supporting functions for key generation, metadata handling, validation
- Includes subgraph integration helpers for off-chain data fetching
- Functions for signature generation and stealth meta-address creation

**Configuration (`src/config/`)**:
- Contract addresses for different chains
- Contract bytecode and deployment start blocks
- Exports: `ERC5564_CONTRACT_ADDRESS`, `ERC6538_CONTRACT_ADDRESS`

### Key Design Patterns

**Two-Level API Design**:
1. **High-level**: Use `createStealthClient()` for most applications
2. **Low-level**: Import individual functions for granular control

**Error Handling**:
- Custom error classes for different failure modes
- Errors include original error context for debugging
- All async functions properly propagate errors

**TypeScript Integration**:
- Comprehensive type exports for all parameters and return values
- Uses Viem's types for blockchain interactions
- BigInt used consistently for block numbers and large integers

**Testing Strategy**:
- Unit tests for pure functions using mocks
- Integration tests against real/forked networks using Anvil
- Real subgraph endpoints used in some tests for accuracy

### Subgraph Integration
The SDK supports both direct blockchain queries and subgraph queries for better performance:
- `getAnnouncements()` - Direct blockchain logs
- `getAnnouncementsUsingSubgraph()` - Subgraph queries with pagination
- Subgraph helpers in `src/lib/actions/getAnnouncementsUsingSubgraph/subgraphHelpers.ts`

### Contract Interaction Patterns
- Uses Viem for all blockchain interactions
- Contract addresses are environment-specific (pulled from config)
- Actions that modify state return transaction objects (prepare functions)
- Read-only actions return processed data directly

## Environment Setup
Tests expect either a local Anvil node or environment variables:
- `RPC_URL` - RPC endpoint for forked testing
- `USE_FORK=true` - Flag to enable fork mode
- Tests default to local Anvil if no environment specified

## Code Organization Notes
- Each action/utility has co-located tests in same directory
- Types are defined alongside implementations, exported centrally
- Examples directory contains working usage examples for each major function
- All crypto functions handle both compressed and uncompressed public keys
- Consistent use of hex strings with 0x prefix for addresses and keys