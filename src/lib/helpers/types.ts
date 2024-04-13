import type {
  Account,
  Client,
  PublicActions,
  RpcSchema,
  Transport,
  WalletActions
} from 'viem';
import { sepolia, type Chain, foundry } from 'viem/chains';
export type VALID_CHAIN_IDS = typeof sepolia.id | typeof foundry.id;

export const VALID_CHAINS: Record<VALID_CHAIN_IDS, Chain> = {
  [sepolia.id]: sepolia,
  [foundry.id]: foundry
};

// A Viem WalletClient with public actions
export type SuperWalletClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined
> = Client<
  transport,
  chain,
  account,
  RpcSchema,
  PublicActions<transport, chain, account> & WalletActions<chain, account>
>;
