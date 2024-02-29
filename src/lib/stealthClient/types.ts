import type { PublicClient } from 'viem';
import type { VALID_CHAIN_IDS } from '../helpers/types';
import type {
  GetAnnouncementsForUserParams,
  GetAnnouncementsParams,
  GetAnnouncementsReturnType,
  GetStealthMetaAddressParams,
  GetStealthMetaAddressReturnType,
} from '../actions/';

export type ClientParams = {
  chainId?: VALID_CHAIN_IDS;
  publicClient?: PublicClient;
  rpcUrl?: string;
};

export type StealthClientInitParams = {
  chainId: VALID_CHAIN_IDS;
  rpcUrl: string;
};

export type StealthClientReturnType = InitializedStealthActions;

export type StealthActions = {
  getAnnouncements: (
    params: GetAnnouncementsParams
  ) => Promise<GetAnnouncementsReturnType>;
  getStealthMetaAddress: (
    params: GetStealthMetaAddressParams
  ) => Promise<GetStealthMetaAddressReturnType>;
  getAnnouncementsForUser: (
    params: GetAnnouncementsForUserParams
  ) => Promise<GetAnnouncementsReturnType>;
};

export type InitializedStealthActions = {
  [K in keyof StealthActions]: (
    params: Parameters<StealthActions[K]>[0]
  ) => ReturnType<StealthActions[K]>;
};

export class PublicClientRequiredError extends Error {
  constructor(message: string = 'publicClient is required') {
    super(message);
    this.name = 'PublicClientRequiredError';
    Object.setPrototypeOf(this, PublicClientRequiredError.prototype);
  }
}
