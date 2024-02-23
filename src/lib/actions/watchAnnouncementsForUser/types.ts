import type { EthAddress } from '../../..';
import type {
  AnnouncementArgs,
  AnnouncementLog,
} from '../getAnnouncements/types';
import type { GetAnnouncementsForUserParams } from '..';

export type WatchAnnouncementsForUserParams<T> = {
  ERC5564Address: EthAddress;
  args: AnnouncementArgs;
  handleLogsForUser: (logs: AnnouncementLog[]) => T;
} & GetAnnouncementsForUserParams;

export type WatchAnnouncementsForUserReturnType = {};
