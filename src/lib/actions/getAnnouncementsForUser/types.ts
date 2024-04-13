import type { EthAddress } from '../../..';
import type { ClientParams } from '../../stealthClient/types';
import type { AnnouncementLog } from '../getAnnouncements/types';

export type GetAnnouncementsForUserParams = {
  announcements: AnnouncementLog[];
  spendingPublicKey: `0x${string}`;
  viewingPrivateKey: `0x${string}`;
  clientParams?: ClientParams;
  excludeList?: EthAddress[]; // Optional: list of "from" values (msg.sender) to exclude
  includeList?: EthAddress[]; // Optional: list of "from" values (msg.sender) to include
};

export type GetAnnouncementsForUserReturnType = AnnouncementLog[];

export type ProcessAnnouncementParams = Omit<
  GetAnnouncementsForUserParams,
  'announcements' | 'excludeList' | 'includeList'
> & {
  excludeList: Set<EthAddress>;
  includeList: Set<EthAddress>;
};

export type ProcessAnnouncementReturnType = AnnouncementLog | null;

export class FromValueNotFoundError extends Error {
  constructor(
    message: string = 'The "from" value could not be retrieved for a transaction.',
  ) {
    super(message);
    this.name = 'FromValueNotFoundError';
    Object.setPrototypeOf(this, FromValueNotFoundError.prototype);
  }
}

export class TransactionHashRequiredError extends Error {
  constructor(message: string = 'The transaction hash is required.') {
    super(message);
    this.name = 'TransactionHashRequiredError';
    Object.setPrototypeOf(this, TransactionHashRequiredError.prototype);
  }
}
