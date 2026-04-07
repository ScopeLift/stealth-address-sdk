import type { EthAddress } from '../../..';
import type { ClientParams } from '../../stealthClient/types';
import type { AnnouncementLog } from '../getAnnouncements/types';

type ScanAnnouncementsForUserUsingSubgraphBaseParams = {
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
  spendingPublicKey: `0x${string}`;
  viewingPrivateKey: `0x${string}`;
  clientParams?: ClientParams;
  excludeList?: EthAddress[];
  includeList?: EthAddress[];
};

export type ScanAnnouncementsForUserUsingSubgraphInitialParams =
  ScanAnnouncementsForUserUsingSubgraphBaseParams & {
    /** The initial scan must omit the cursor so the scan starts from the newest page */
    cursor?: undefined;
    /** The initial scan may omit the snapshot block; the SDK resolves and returns it */
    snapshotBlock?: undefined;
  };

export type ScanAnnouncementsForUserUsingSubgraphNextParams =
  ScanAnnouncementsForUserUsingSubgraphBaseParams & {
    /** The exclusive prior-page announcement id used with the query's `id desc` ordering */
    cursor: string;
    /** The fixed subgraph block returned by the initial page and reused for the rest of the scan */
    snapshotBlock: bigint | number;
  };

export type ScanAnnouncementsForUserUsingSubgraphParams =
  | ScanAnnouncementsForUserUsingSubgraphInitialParams
  | ScanAnnouncementsForUserUsingSubgraphNextParams;

export type ScanAnnouncementsForUserUsingSubgraphBatch = {
  announcements: AnnouncementLog[];
  scannedCount: number;
  nextCursor?: string;
  snapshotBlock: bigint;
};

export type ScanAnnouncementsForUserUsingSubgraphReturnType = AsyncGenerator<
  ScanAnnouncementsForUserUsingSubgraphBatch,
  void,
  unknown
>;

export class ScanAnnouncementsForUserUsingSubgraphError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ScanAnnouncementsForUserUsingSubgraphError';
  }
}
