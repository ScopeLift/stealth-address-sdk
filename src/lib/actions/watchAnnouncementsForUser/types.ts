import type { EthAddress } from '../../..';
import type {
  AnnouncementArgs,
  AnnouncementLog,
} from '../getAnnouncements/types';
import type { GetAnnouncementsForUserParams } from '..';
import type {
  GetPollOptions,
  Transport,
  WatchContractEventReturnType,
} from 'viem';

export type WatchAnnouncementsForUserPollingOptions = GetPollOptions<Transport>;

export type WatchAnnouncementsForUserParams<T> = {
  ERC5564Address: EthAddress;
  args: AnnouncementArgs;
  handleLogsForUser: (logs: AnnouncementLog[]) => T;
  pollOptions?: WatchAnnouncementsForUserPollingOptions;
} & Omit<GetAnnouncementsForUserParams, 'announcements'>;

export type WatchAnnouncementsForUserReturnType = WatchContractEventReturnType;
