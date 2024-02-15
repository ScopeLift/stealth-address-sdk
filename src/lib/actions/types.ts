import type { Log, PublicClient } from 'viem';
import type { EthAddress } from '../../utils/crypto/types';
import type { VALID_CHAIN_IDS } from '../helpers/types';

export type ClientParams = {
  chainId?: VALID_CHAIN_IDS;
  publicClient?: PublicClient;
  rpcUrl?: string;
};

export type StealthClientInitParams = {
  chainId: VALID_CHAIN_IDS;
  rpcUrl: string;
};

export type StealthClientReturnType = InitializedStealthActions;

export type BlockType =
  | bigint
  | 'latest'
  | 'earliest'
  | 'pending'
  | 'safe'
  | 'finalized';

export type GetAnnouncementsParams = {
  clientParams?: ClientParams;
  ERC5564Address: EthAddress;
  args: {
    schemeId?: bigint | bigint[] | null | undefined;
    stealthAddress?: `0x${string}` | `0x${string}`[] | null | undefined;
    caller?: `0x${string}` | `0x${string}`[] | null | undefined;
  };
  fromBlock?: BlockType;
  toBlock?: BlockType;
};

export interface AnnouncementLog extends Log {
  caller: EthAddress | undefined;
  ephemeralPubKey: `0x${string}` | undefined;
  metadata: `0x${string}` | undefined;
  schemeId: bigint | undefined;
  stealthAddress: EthAddress | undefined;
}
export type GetAnnouncementsReturnType = AnnouncementLog[];

export interface StealthActions {
  getAnnouncements: (
    params: GetAnnouncementsParams
  ) => Promise<GetAnnouncementsReturnType>;
}

export type InitializedStealthActions = {
  [K in keyof StealthActions]: (
    params: Parameters<StealthActions[K]>[0]
  ) => ReturnType<StealthActions[K]>;
};
