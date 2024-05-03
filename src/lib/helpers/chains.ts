import { type Chain } from 'viem';
import { VALID_CHAINS, type VALID_CHAIN_IDS } from './types';

export const getChain = (id: VALID_CHAIN_IDS): Chain | undefined =>
  VALID_CHAINS[id];
