import type {
  Account,
  Client,
  PublicActions,
  RpcSchema,
  Transport,
  WalletActions
} from 'viem';
import {
  type Chain,
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  foundry,
  gnosis,
  holesky,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  scroll,
  sepolia
} from 'viem/chains';
export type VALID_CHAIN_IDS =
  | typeof arbitrum.id
  | typeof arbitrumSepolia.id
  | typeof base.id
  | typeof baseSepolia.id
  | typeof foundry.id
  | typeof gnosis.id
  | typeof holesky.id
  | typeof mainnet.id
  | typeof optimism.id
  | typeof optimismSepolia.id
  | typeof polygon.id
  | typeof scroll.id
  | typeof sepolia.id;

// Valid chains where the ERC5564 and ERC6538 contracts are deployed
// The contract addresses for each chain can be found here: https://stealthaddress.dev/contracts/deployments
export const VALID_CHAINS: Record<VALID_CHAIN_IDS, Chain> = {
  [arbitrum.id]: arbitrum,
  [arbitrumSepolia.id]: arbitrumSepolia,
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
  [foundry.id]: foundry,
  [gnosis.id]: gnosis,
  [holesky.id]: holesky,
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [optimismSepolia.id]: optimismSepolia,
  [polygon.id]: polygon,
  [scroll.id]: scroll,
  [sepolia.id]: sepolia
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
