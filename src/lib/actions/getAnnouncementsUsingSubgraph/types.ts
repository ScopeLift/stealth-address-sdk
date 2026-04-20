import type { EthAddress } from '../../../utils/crypto/types';
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
  timestamp?: string;

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
  /** (Optional) The number of results to fetch per page; defaults to 1000 for backward compatibility */
  pageSize?: number;
};

export type GetAnnouncementsUsingSubgraphReturnType =
  GetAnnouncementsReturnType;

type GetAnnouncementsPageUsingSubgraphFilterParams = {
  /** The URL of the subgraph to fetch announcements from */
  subgraphUrl: string;
  /** (Optional) The lower inclusive block bound for the scan */
  fromBlock?: bigint | number;
  /** (Optional) The upper inclusive block bound for the scan */
  toBlock?: bigint | number;
  /** (Optional) The scheme ID to filter by */
  schemeId?: bigint | number;
  /** (Optional) The caller address to filter by */
  caller?: EthAddress;
  /** (Optional) The number of results to fetch per page; defaults to 999 */
  pageSize?: number;
};

export type GetAnnouncementsPageUsingSubgraphInitialParams =
  GetAnnouncementsPageUsingSubgraphFilterParams & {
    /** The initial page must omit the cursor so the scan starts from the newest page */
    cursor?: undefined;
    /** The initial page may omit the snapshot block; the SDK resolves and returns it */
    snapshotBlock?: undefined;
  };

export type GetAnnouncementsPageUsingSubgraphNextParams =
  GetAnnouncementsPageUsingSubgraphFilterParams & {
    /** The exclusive prior-page announcement id used with the query's `id desc` ordering */
    cursor: string;
    /** The fixed subgraph block returned by the initial page and reused for the rest of the scan */
    snapshotBlock: bigint | number;
  };

export type GetAnnouncementsPageUsingSubgraphParams =
  | GetAnnouncementsPageUsingSubgraphInitialParams
  | GetAnnouncementsPageUsingSubgraphNextParams;

export type GetAnnouncementsPageUsingSubgraphReturnType = {
  announcements: GetAnnouncementsReturnType;
  /** Present only when another page exists for the same bounded query */
  nextCursor?: string;
  /** The fixed subgraph block used for this page and any subsequent pages in the same scan */
  snapshotBlock: bigint;
};

export type GetAnnouncementsPageUsingSubgraphUnsafeParams =
  GetAnnouncementsPageUsingSubgraphFilterParams & {
    /** (Optional) The exclusive prior-page announcement id used with the query's `id desc` ordering */
    cursor?: string;
    /** (Optional) The fixed subgraph block used to keep every page in the same snapshot */
    snapshotBlock?: bigint | number;
  };

export class GetAnnouncementsUsingSubgraphError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'GetAnnouncementsUsingSubgraphError';
  }
}
