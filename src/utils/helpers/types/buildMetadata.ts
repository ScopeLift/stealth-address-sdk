import type { Address, Hex } from 'viem';

export type ViewTag = `0x${string}`;
export type FunctionSelector = `0x${string}`;
export type TokenAmount = string | number | bigint;

export interface BaseMetadataParams {
  viewTag: ViewTag;
}

export interface ETHMetadataParams extends BaseMetadataParams {
  amount: TokenAmount;
}

export interface ERC20MetadataParams extends BaseMetadataParams {
  tokenAddress: Address;
  amount: TokenAmount;
  functionSelector?: FunctionSelector;
}

export interface ERC721MetadataParams extends BaseMetadataParams {
  tokenAddress: Address;
  tokenId: TokenAmount;
  functionSelector?: FunctionSelector;
}

export interface CustomMetadataParams extends BaseMetadataParams {
  functionSelector: FunctionSelector;
  contractAddress: Address;
  data: TokenAmount;
}

export interface MetadataComponents {
  viewTag: ViewTag;
  functionIdentifier: Hex;
  contractAddress: Address;
  amount: Hex;
}
