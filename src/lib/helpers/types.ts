import { sepolia, goerli, type Chain } from 'viem/chains';
export type VALID_CHAIN_IDS = typeof sepolia.id | typeof goerli.id;

export const VALID_CHAINS: Record<VALID_CHAIN_IDS, Chain> = {
  [sepolia.id]: sepolia,
  [goerli.id]: goerli,
};
