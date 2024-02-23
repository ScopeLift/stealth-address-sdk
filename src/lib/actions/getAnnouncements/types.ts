import type { Log } from 'viem';
import type { EthAddress } from '../../../utils/crypto/types';
import type { BlockType } from '../types';
import type { ClientParams } from '../../stealthClient/types';

export type AnnouncementArgs = {
  schemeId?: bigint | bigint[] | null | undefined;
  stealthAddress?: `0x${string}` | `0x${string}`[] | null | undefined;
  caller?: `0x${string}` | `0x${string}`[] | null | undefined;
};

export interface AnnouncementLog extends Log {
  caller: EthAddress;
  ephemeralPubKey: `0x${string}`;
  metadata: `0x${string}`;
  schemeId: bigint;
  stealthAddress: EthAddress;
}

export type GetAnnouncementsParams = {
  clientParams?: ClientParams;
  ERC5564Address: EthAddress;
  args: AnnouncementArgs;
  fromBlock?: BlockType;
  toBlock?: BlockType;
};
export type GetAnnouncementsReturnType = AnnouncementLog[];
