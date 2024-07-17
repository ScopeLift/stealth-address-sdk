import type { GetAnnouncementsReturnType } from '../getAnnouncements/types';

export type SubgraphAnnouncementEntity = {
  block: string;
  caller: string;
  ephemeralPubKey: string;
  id: string;
  metadata: string;
  schemeId: string;
  stealthAddress: string;
  transactionHash: string;

  // Additional log information
  blockHash: string;
  data: string;
  logIndex: string;
  removed: boolean;
  topics: string[];
  transactionIndex: string;
};

export type GetAnnouncementsUsingSubgraphParams = {
  subgraphUrl: string;
  fromBlock?: number;
  toBlock?: number;
  query?: string;
};

export type GetAnnouncementsUsingSubgraphReturnType =
  GetAnnouncementsReturnType;
