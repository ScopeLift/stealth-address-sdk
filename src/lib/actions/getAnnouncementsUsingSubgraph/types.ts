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
  /** The URL of the subgraph to fetch announcements from */
  subgraphUrl: string;
  /** (Optional, but recommended) The block number to fetch from; defaults to 0, but can be slow to fetch for large block ranges */
  fromBlock?: number;
  /** (Optional) The block number to fetch up to; defaults to the latest block */
  toBlock?: number;
  /** (Optional) The GraphQL query to use; defaults to a generic query that fetches all announcements */
  query?: string;
  /** (Optional) The filter options to use when fetching announcements*/
  filterOptions?: GetAnnouncementsUsingSubgraphFilterOptions;
  /** (Optional) The number of results to fetch per page; defaults to 1000 (max allowed by subgraph providers usually) */
  pageSize?: number;
};

export type GetAnnouncementsUsingSubgraphFilterOptions = {
  caller?: `0x${string}`;
};

export type GetAnnouncementsUsingSubgraphReturnType =
  GetAnnouncementsReturnType;
