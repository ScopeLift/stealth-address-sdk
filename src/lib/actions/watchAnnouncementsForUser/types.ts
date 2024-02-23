import type { Log } from 'viem';
import type { EthAddress } from '../../..';
import type { ClientParams } from '../../stealthClient/types';
import type { AnnouncementArgs } from '../getAnnouncements/types';

export type WatchAnnouncementsForUserParams<T> = {
  clientParams?: ClientParams;
  ERC5564Address: EthAddress;
  args: AnnouncementArgs;
  handleLogs: (logs: WatchAnnouncementLog[]) => T;
};

export type WatchAnnouncementLog = Log & {
  args: {
    caller: EthAddress;
    ephemeralPubKey: `0x${string}`;
    metadata: `0x${string}`;
    schemeId: bigint;
    stealthAddress: EthAddress;
  };
};

export type WatchAnnouncementsForUserReturnType = {};
