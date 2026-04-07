import type {
  GetPollOptions,
  Transport,
  WatchContractEventReturnType
} from 'viem';
import type { GetAnnouncementsForUserParams } from '..';
import type { EthAddress } from '../../..';
import type {
  AnnouncementArgs,
  AnnouncementLog
} from '../getAnnouncements/types';

export type WatchAnnouncementsForUserPollingOptions = GetPollOptions<Transport>;

export type WatchAnnouncementsForUserPollMeta = {
  fromBlock?: bigint | 'latest';
  observedBlock: bigint;
  pollTimestamp: number;
};

export type WatchAnnouncementsForUserBatchMeta =
  WatchAnnouncementsForUserPollMeta & {
    rawLogCount: number;
    relevantLogCount: number;
  };

export type WatchAnnouncementsForUserHandler<T = void> = (
  logs: AnnouncementLog[],
  meta: WatchAnnouncementsForUserBatchMeta
) => T | Promise<T>;

export type WatchAnnouncementsForUserErrorHandler = (
  error: Error
) => void | Promise<void>;

export type WatchAnnouncementsForUserHeartbeatHandler = (
  meta: WatchAnnouncementsForUserPollMeta
) => void | Promise<void>;

export type WatchAnnouncementsForUserParams<T = void> = {
  /** The address of the ERC5564 contract. */
  ERC5564Address: EthAddress;
  /** The arguments to filter the announcements. */
  args: AnnouncementArgs;
  /** Optional lower inclusive block bound for the live watch. */
  fromBlock?: bigint | 'latest';
  /** The callback function to handle the filtered announcement logs. */
  handleLogsForUser: WatchAnnouncementsForUserHandler<T>;
  /** Optional error handler for asynchronous watch processing failures. */
  onError?: WatchAnnouncementsForUserErrorHandler;
  /** Optional callback invoked whenever the watcher observes a chain head while polling. */
  onHeartbeat?: WatchAnnouncementsForUserHeartbeatHandler;
  /** Optional polling options  */
  pollOptions?: WatchAnnouncementsForUserPollingOptions;
} & Omit<GetAnnouncementsForUserParams, 'announcements'>;

export type WatchAnnouncementsForUserReturnType = WatchContractEventReturnType;
