import { pad, toFunctionSelector, toHex } from 'viem';
import type { Address, Hex } from 'viem';
import type {
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

// Generate ERC-20 function selectors from viem
export const ERC20_FUNCTION_SELECTORS = {
  TRANSFER: toFunctionSelector('transfer(address,uint256)'),
  TRANSFER_FROM: toFunctionSelector('transferFrom(address,address,uint256)'),
  APPROVE: toFunctionSelector('approve(address,uint256)')
} as const;

// Generate ERC-721 function selectors from viem
export const ERC721_FUNCTION_SELECTORS = {
  TRANSFER_FROM: toFunctionSelector('transferFrom(address,address,uint256)'),
  SAFE_TRANSFER_FROM: toFunctionSelector(
    'safeTransferFrom(address,address,uint256)'
  ),
  SAFE_TRANSFER_FROM_WITH_DATA: toFunctionSelector(
    'safeTransferFrom(address,address,uint256,bytes)'
  ),
  APPROVE: toFunctionSelector('approve(address,uint256)'),
  SET_APPROVAL_FOR_ALL: toFunctionSelector('setApprovalForAll(address,bool)')
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
 * Builds ERC-5564 compliant metadata for native ETH transfers
 *
 * @param params - Parameters for ETH metadata
 * @param params.viewTag - 1-byte view tag for announcement filtering (e.g., "0x99")
 * @param params.amount - Amount of ETH to transfer in wei (string, number, or bigint)
 * @returns 57-byte metadata hex string compliant with ERC-5564
 *
 * @example
 * ```typescript
 * import { parseUnits } from 'viem';
 *
 * const metadata = buildMetadataForETH({
 *   viewTag: "0x99",
 *   amount: parseUnits("1.5", 18) // 1.5 ETH
 * });
 * ```
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
 * Builds ERC-5564 compliant metadata for ERC-20 token transfers
 *
 * @param params - Parameters for ERC-20 metadata
 * @param params.viewTag - 1-byte view tag for announcement filtering (e.g., "0x99")
 * @param params.tokenAddress - ERC-20 token contract address
 * @param params.amount - Amount of tokens to transfer (in token's smallest unit)
 * @param params.functionSelector - Function selector (default: transfer)
 * @returns 57-byte metadata hex string compliant with ERC-5564
 *
 * @example
 * ```typescript
 * import { parseUnits } from 'viem';
 *
 * const metadata = buildMetadataForERC20({
 *   viewTag: "0x99",
 *   tokenAddress: "0xA0b86a33E6441E6837FD5E163Aa01879cBbD5bbD",
 *   amount: parseUnits("100", 18), // 100 tokens with 18 decimals
 *   functionSelector: ERC20_FUNCTION_SELECTORS.TRANSFER // optional
 * });
 * ```
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
 * Builds ERC-5564 compliant metadata for ERC-721 (NFT) token transfers
 *
 * @param params - Parameters for ERC-721 metadata
 * @param params.viewTag - 1-byte view tag for announcement filtering (e.g., "0x99")
 * @param params.tokenAddress - ERC-721 token contract address
 * @param params.tokenId - Token ID to transfer
 * @param params.functionSelector - Function selector (default: transferFrom)
 * @returns 57-byte metadata hex string compliant with ERC-5564
 *
 * @example
 * ```typescript
 * const metadata = buildMetadataForERC721({
 *   viewTag: "0x99",
 *   tokenAddress: "0xA0b86a33E6441E6837FD5E163Aa01879cBbD5bbD",
 *   tokenId: 12345,
 *   functionSelector: ERC721_FUNCTION_SELECTORS.SAFE_TRANSFER_FROM // optional
 * });
 * ```
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
 * Builds ERC-5564 compliant metadata for custom contract interactions
 *
 * @param params - Parameters for custom metadata
 * @param params.viewTag - 1-byte view tag for announcement filtering (e.g., "0x99")
 * @param params.functionSelector - Function selector for the contract call
 * @param params.contractAddress - Target contract address
 * @param params.data - Custom data payload (32 bytes)
 * @returns 57-byte metadata hex string compliant with ERC-5564
 *
 * @example
 * ```typescript
 * import { toFunctionSelector } from 'viem';
 *
 * const metadata = buildMetadataCustom({
 *   viewTag: "0x99",
 *   functionSelector: toFunctionSelector('mint(address,uint256)'),
 *   contractAddress: "0xA0b86a33E6441E6837FD5E163Aa01879cBbD5bbD",
 *   data: 12345 // Custom payload
 * });
 * ```
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
 * Parses ERC-5564 metadata back into its components for debugging and validation
 *
 * @param metadata - 57-byte metadata hex string to parse
 * @returns Parsed metadata components
 * @throws Error if metadata format is invalid
 *
 * @example
 * ```typescript
 * const components = parseMetadata("0x99a9059cbb...");
 * console.log(components.viewTag); // "0x99"
 * console.log(components.functionIdentifier); // "0xa9059cbb"
 * ```
 */
export function parseMetadata(metadata: Hex): MetadataComponents {
  if (!metadata.startsWith('0x')) {
    throw new Error('Metadata must start with 0x prefix');
  }

  if (metadata.length !== 116) {
    throw new Error(
      `Invalid metadata length: expected 116 characters (0x + 114 hex), got ${metadata.length}`
    );
  }

  // Validate hex format
  if (!/^0x[0-9a-fA-F]{114}$/.test(metadata)) {
    throw new Error('Metadata contains invalid hex characters');
  }

  const metadataWithoutPrefix = metadata.slice(2);

  return {
    viewTag: `0x${metadataWithoutPrefix.slice(0, 2)}` as ViewTag,
    functionIdentifier: `0x${metadataWithoutPrefix.slice(2, 10)}` as Hex,
    contractAddress: `0x${metadataWithoutPrefix.slice(10, 50)}` as Address,
    amount: `0x${metadataWithoutPrefix.slice(50, 114)}` as Hex
  };
}
