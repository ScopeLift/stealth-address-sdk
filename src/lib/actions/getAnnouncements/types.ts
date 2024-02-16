import type { Log } from 'viem';
import type { EthAddress } from '../../../utils/crypto/types';
import type { BlockType, ClientParams } from '../types';

export interface AnnouncementLog extends Log {
  caller: EthAddress | undefined;
  ephemeralPubKey: `0x${string}` | undefined;
  metadata: `0x${string}` | undefined;
  schemeId: bigint | undefined;
  stealthAddress: EthAddress | undefined;
}

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
export type GetAnnouncementsReturnType = AnnouncementLog[];
