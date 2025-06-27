import type { GetAnnouncementsReturnType } from '../getAnnouncements/types';

export type SubgraphAnnouncementEntity = {
  // Core required fields
  id: string;
  blockNumber?: string;
  caller?: string;
  ephemeralPubKey?: string;
  metadata?: string;
  schemeId?: string;
  stealthAddress?: string;
  transactionHash?: string;

  // Additional log information (may be missing in some subgraph implementations)
  blockHash?: string;
  data?: string;
  logIndex?: string;
  removed?: boolean;
  topics?: string[];
  transactionIndex?: string;
};

export type GetAnnouncementsUsingSubgraphParams = {
  /** The URL of the subgraph to fetch announcements from */
  subgraphUrl: string;
  /** (Optional) The filter options to use when fetching announcements */
  filter?: string;
  /** (Optional) The number of results to fetch per page; defaults to 1000 (max allowed by subgraph providers usually) */
  pageSize?: number;
};

export type GetAnnouncementsUsingSubgraphReturnType =
  GetAnnouncementsReturnType;

export class GetAnnouncementsUsingSubgraphError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'GetAnnouncementsUsingSubgraphError';
  }
}
