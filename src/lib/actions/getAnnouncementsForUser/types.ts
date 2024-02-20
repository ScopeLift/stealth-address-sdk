import type { EthAddress } from '../../..';
import type { ClientParams } from '../../stealthClient/types';
import type { AnnouncementLog } from '../getAnnouncements/types';

export type GetAnnouncementsForUserParams = {
  announcements: AnnouncementLog[];
  spendingPublicKey: `0x${string}`;
  userStealthAddress: EthAddress;
  viewingPrivateKey: `0x${string}`;
  clientParams?: ClientParams;
  excludeList?: EthAddress[]; // Optional: list of "from" values (msg.sender) to exclude
  includeList?: EthAddress[]; // Optional: list of "from" values (msg.sender) to include
};

export type GetAnnouncementsForUserReturnType = AnnouncementLog[];
