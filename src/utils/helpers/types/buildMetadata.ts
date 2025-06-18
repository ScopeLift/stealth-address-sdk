import type { Address, Hex } from 'viem';

export type ViewTag = `0x${string}`;
export type FunctionSelector = `0x${string}`;
export type TokenAmount = string | number | bigint;

export interface ETHMetadataParams {
  viewTag: ViewTag;
  amount: TokenAmount;
}

export interface ERC20MetadataParams {
  viewTag: ViewTag;
  tokenAddress: Address;
  amount: TokenAmount;
  functionSelector?: FunctionSelector;
}

export interface ERC721MetadataParams {
  viewTag: ViewTag;
  tokenAddress: Address;
  tokenId: TokenAmount;
  functionSelector?: FunctionSelector;
}

export interface CustomMetadataParams {
  viewTag: ViewTag;
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
