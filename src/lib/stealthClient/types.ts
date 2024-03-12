import type { PublicClient } from 'viem';
import type { VALID_CHAIN_IDS } from '../helpers/types';
import type {
  GetAnnouncementsForUserParams,
  GetAnnouncementsParams,
  GetAnnouncementsReturnType,
  GetStealthMetaAddressParams,
  GetStealthMetaAddressReturnType,
  WatchAnnouncementsForUserParams,
  WatchAnnouncementsForUserReturnType,
} from '../actions/';

export type ClientParams =
  | {
      publicClient: PublicClient;
    }
  | {
      chainId: VALID_CHAIN_IDS;
      rpcUrl: string;
    };

export type StealthClientInitParams = {
  chainId: VALID_CHAIN_IDS;
  rpcUrl: string;
};

export type StealthClientReturnType = StealthActions;

export type StealthActions = {
  getAnnouncements: ({
    ERC5564Address,
    args,
    fromBlock,
    toBlock,
  }: GetAnnouncementsParams) => Promise<GetAnnouncementsReturnType>;
  getStealthMetaAddress: ({
    ERC6538Address,
    registrant,
    schemeId,
  }: GetStealthMetaAddressParams) => Promise<GetStealthMetaAddressReturnType>;
  getAnnouncementsForUser: ({
    announcements,
    spendingPublicKey,
    viewingPrivateKey,
    excludeList,
    includeList,
  }: GetAnnouncementsForUserParams) => Promise<GetAnnouncementsReturnType>;
  watchAnnouncementsForUser: <T>({
    ERC5564Address,
    args,
    handleLogsForUser,
    spendingPublicKey,
    viewingPrivateKey,
    pollOptions,
  }: WatchAnnouncementsForUserParams<T>) => Promise<WatchAnnouncementsForUserReturnType>;
};

export class PublicClientRequiredError extends Error {
  constructor(message: string = 'publicClient is required') {
    super(message);
    this.name = 'PublicClientRequiredError';
    Object.setPrototypeOf(this, PublicClientRequiredError.prototype);
  }
}
