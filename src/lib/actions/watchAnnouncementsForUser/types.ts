import type { EthAddress } from '../../..';
import type {
  AnnouncementArgs,
  AnnouncementLog
} from '../getAnnouncements/types';
import type { GetAnnouncementsForUserParams } from '..';
import type {
  GetPollOptions,
  Transport,
  WatchContractEventReturnType
} from 'viem';

export type WatchAnnouncementsForUserPollingOptions = GetPollOptions<Transport>;

export type WatchAnnouncementsForUserParams<T> = {
  /** The address of the ERC5564 contract. */
  ERC5564Address: EthAddress;
  /** The arguments to filter the announcements. */
  args: AnnouncementArgs;
  /** The callback function to handle the filtered announcement logs. */
  handleLogsForUser: (logs: AnnouncementLog[]) => T;
  /** Optional polling options  */
  pollOptions?: WatchAnnouncementsForUserPollingOptions;
} & Omit<GetAnnouncementsForUserParams, 'announcements'>;

export type WatchAnnouncementsForUserReturnType = WatchContractEventReturnType;
