import { pad, toHex } from 'viem';
import type { Address, Hex } from 'viem';
import type {
  BaseMetadataParams,
  CustomMetadataParams,
  ERC20MetadataParams,
  ERC721MetadataParams,
  ETHMetadataParams,
  FunctionSelector,
  MetadataComponents,
  TokenAmount,
  ViewTag
} from './types/buildMetadata.js';

// Constants from ERC-5564 specification
const ETH_TOKEN_IDENTIFIER = '0xeeeeeeee' as const;
const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

// Common ERC-20 function selectors
export const ERC20_FUNCTION_SELECTORS = {
  TRANSFER: '0xa9059cbb',
  TRANSFER_FROM: '0x23b872dd',
  APPROVE: '0x095ea7b3'
} as const;

// Common ERC-721 function selectors
export const ERC721_FUNCTION_SELECTORS = {
  TRANSFER_FROM: '0x23b872dd',
  SAFE_TRANSFER_FROM: '0x42842e0e',
  SAFE_TRANSFER_FROM_WITH_DATA: '0xb88d4fde',
  APPROVE: '0x095ea7b3',
  SET_APPROVAL_FOR_ALL: '0xa22cb465'
} as const;

/**
 * Converts a token amount to a 32-byte hex string
 */
function formatTokenAmount(amount: TokenAmount): Hex {
  const bigintAmount = typeof amount === 'bigint' ? amount : BigInt(amount);
  return pad(toHex(bigintAmount), { size: 32 });
}

/**
 * Validates that the view tag is exactly 1 byte (2 hex characters + 0x prefix)
 */
function validateViewTag(viewTag: ViewTag): void {
  if (!viewTag.startsWith('0x') || viewTag.length !== 4) {
    throw new Error('View tag must be exactly 1 byte (0x + 2 hex characters)');
  }
}

/**
 * Validates that the function selector is exactly 4 bytes (8 hex characters + 0x prefix)
 */
function validateFunctionSelector(selector: FunctionSelector): void {
  if (!selector.startsWith('0x') || selector.length !== 10) {
    throw new Error(
      'Function selector must be exactly 4 bytes (0x + 8 hex characters)'
    );
  }
}

/**
 * Builds metadata for native ETH transfers according to ERC-5564
 *
 * Metadata structure:
 * - Byte 1: View tag
 * - Bytes 2-5: 0xeeeeeeee (ETH identifier)
 * - Bytes 6-25: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE (ETH address)
 * - Bytes 26-57: Amount of ETH (32 bytes)
 */
export function buildMetadataForETH({
  viewTag,
  amount
}: ETHMetadataParams): Hex {
  validateViewTag(viewTag);

  const formattedAmount = formatTokenAmount(amount);

  const components: MetadataComponents = {
    viewTag,
    functionIdentifier: ETH_TOKEN_IDENTIFIER,
    contractAddress: ETH_TOKEN_ADDRESS,
    amount: formattedAmount
  };

  return buildMetadataFromComponents(components);
}

/**
 * Builds metadata for ERC-20 token transfers according to ERC-5564
 *
 * Metadata structure:
 * - Byte 1: View tag
 * - Bytes 2-5: Function selector (default: transfer)
 * - Bytes 6-25: Token contract address
 * - Bytes 26-57: Token amount (32 bytes)
 */
export function buildMetadataForERC20({
  viewTag,
  tokenAddress,
  amount,
  functionSelector = ERC20_FUNCTION_SELECTORS.TRANSFER
}: ERC20MetadataParams): Hex {
  validateViewTag(viewTag);
  validateFunctionSelector(functionSelector);

  const formattedAmount = formatTokenAmount(amount);

  const components: MetadataComponents = {
    viewTag,
    functionIdentifier: functionSelector,
    contractAddress: tokenAddress,
    amount: formattedAmount
  };

  return buildMetadataFromComponents(components);
}

/**
 * Builds metadata for ERC-721 token transfers according to ERC-5564
 *
 * Metadata structure:
 * - Byte 1: View tag
 * - Bytes 2-5: Function selector (default: transferFrom)
 * - Bytes 6-25: Token contract address
 * - Bytes 26-57: Token ID (32 bytes)
 */
export function buildMetadataForERC721({
  viewTag,
  tokenAddress,
  tokenId,
  functionSelector = ERC721_FUNCTION_SELECTORS.TRANSFER_FROM
}: ERC721MetadataParams): Hex {
  validateViewTag(viewTag);
  validateFunctionSelector(functionSelector);

  const formattedTokenId = formatTokenAmount(tokenId);

  const components: MetadataComponents = {
    viewTag,
    functionIdentifier: functionSelector,
    contractAddress: tokenAddress,
    amount: formattedTokenId
  };

  return buildMetadataFromComponents(components);
}

/**
 * Builds metadata for custom contract interactions according to ERC-5564
 *
 * Metadata structure:
 * - Byte 1: View tag
 * - Bytes 2-5: Function selector
 * - Bytes 6-25: Contract address
 * - Bytes 26-57: Custom data (32 bytes)
 */
export function buildMetadataCustom({
  viewTag,
  functionSelector,
  contractAddress,
  data
}: CustomMetadataParams): Hex {
  validateViewTag(viewTag);
  validateFunctionSelector(functionSelector);

  const formattedData = formatTokenAmount(data);

  const components: MetadataComponents = {
    viewTag,
    functionIdentifier: functionSelector,
    contractAddress: contractAddress,
    amount: formattedData
  };

  return buildMetadataFromComponents(components);
}

/**
 * Low-level function to build metadata from components
 * Internal use only - use the specific builder functions above
 */
function buildMetadataFromComponents({
  viewTag,
  functionIdentifier,
  contractAddress,
  amount
}: MetadataComponents): Hex {
  // Ensure all components have the correct format
  const viewTagBytes = viewTag.slice(2); // Remove 0x prefix
  const functionIdBytes = functionIdentifier.slice(2); // Remove 0x prefix
  const addressBytes = contractAddress.slice(2); // Remove 0x prefix
  const amountBytes = amount.slice(2); // Remove 0x prefix

  // Concatenate all components
  const metadata = `0x${viewTagBytes}${functionIdBytes}${addressBytes}${amountBytes}`;

  return metadata as Hex;
}

/**
 * Parses metadata back into its components for debugging/validation
 * Useful for testing and verification
 */
export function parseMetadata(metadata: Hex): MetadataComponents {
  if (!metadata.startsWith('0x') || metadata.length !== 116) {
    throw new Error(
      'Invalid metadata format - must be 57 bytes (0x + 114 hex characters)'
    );
  }

  const metadataWithoutPrefix = metadata.slice(2);

  return {
    viewTag: `0x${metadataWithoutPrefix.slice(0, 2)}` as ViewTag,
    functionIdentifier: `0x${metadataWithoutPrefix.slice(2, 10)}` as Hex,
    contractAddress: `0x${metadataWithoutPrefix.slice(10, 50)}` as Address,
    amount: `0x${metadataWithoutPrefix.slice(50, 114)}` as Hex
  };
}

/**
 * Builds basic metadata with only the view tag (backward compatibility)
 * This is the current behavior of the SDK
 */
export function buildMetadataWithViewTagOnly({
  viewTag
}: BaseMetadataParams): ViewTag {
  validateViewTag(viewTag);
  return viewTag;
}
