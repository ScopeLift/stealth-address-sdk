import type { EthAddress } from '../../..';
import type {
  AnnouncementArgs,
  AnnouncementLog,
} from '../getAnnouncements/types';
import type { GetAnnouncementsForUserParams } from '..';
import type { WatchContractEventReturnType } from 'viem';

export type WatchAnnouncementsForUserParams<T> = {
  ERC5564Address: EthAddress;
  args: AnnouncementArgs;
  handleLogsForUser: (logs: AnnouncementLog[]) => T;
} & Omit<GetAnnouncementsForUserParams, 'announcements'>;

export type WatchAnnouncementsForUserReturnType = WatchContractEventReturnType;
