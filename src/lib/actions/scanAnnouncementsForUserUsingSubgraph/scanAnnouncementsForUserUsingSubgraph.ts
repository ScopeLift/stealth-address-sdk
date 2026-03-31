import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import type { AnnouncementLog } from '../getAnnouncements/types';
import {
  announcementFiltersRequireTransactionLookup,
  filterAnnouncementsForUserBatch,
  normalizeAnnouncementAddressFilters
} from '../getAnnouncementsForUser/getAnnouncementsForUser';
import getAnnouncementsPageUsingSubgraph from '../getAnnouncementsUsingSubgraph/getAnnouncementsPageUsingSubgraph';
import type {
  GetAnnouncementsPageUsingSubgraphParams,
  GetAnnouncementsPageUsingSubgraphReturnType
} from '../getAnnouncementsUsingSubgraph/types';
import {
  type ScanAnnouncementsForUserUsingSubgraphBatch,
  ScanAnnouncementsForUserUsingSubgraphError,
  type ScanAnnouncementsForUserUsingSubgraphParams,
  type ScanAnnouncementsForUserUsingSubgraphReturnType
} from './types';

type GetAnnouncementsPageUsingSubgraphFn = (
  params: GetAnnouncementsPageUsingSubgraphParams
) => Promise<GetAnnouncementsPageUsingSubgraphReturnType>;

function assertValidScanParams({
  cursor,
  snapshotBlock
}: Pick<
  ScanAnnouncementsForUserUsingSubgraphParams,
  'cursor' | 'snapshotBlock'
>): void {
  if ((cursor === undefined) !== (snapshotBlock === undefined)) {
    throw new Error(
      'cursor and snapshotBlock must either both be omitted for the initial page or both be provided for subsequent pages'
    );
  }
}

export function compareAnnouncementsByChainRecency(
  left: AnnouncementLog,
  right: AnnouncementLog
): number {
  const leftBlockNumber = left.blockNumber;
  const rightBlockNumber = right.blockNumber;

  if (leftBlockNumber === null || rightBlockNumber === null) {
    throw new Error(
      'Subgraph pages must include blockNumber to preserve strict chain recency'
    );
  }

  if (leftBlockNumber !== rightBlockNumber) {
    return leftBlockNumber > rightBlockNumber ? -1 : 1;
  }

  const leftTransactionIndex = left.transactionIndex;
  const rightTransactionIndex = right.transactionIndex;

  if (leftTransactionIndex === null || rightTransactionIndex === null) {
    throw new Error(
      'Subgraph pages must include transactionIndex to preserve strict chain recency'
    );
  }

  if (leftTransactionIndex !== rightTransactionIndex) {
    return leftTransactionIndex > rightTransactionIndex ? -1 : 1;
  }

  const leftLogIndex = left.logIndex;
  const rightLogIndex = right.logIndex;

  if (leftLogIndex === null || rightLogIndex === null) {
    throw new Error(
      'Subgraph pages must include logIndex to preserve strict chain recency'
    );
  }

  if (leftLogIndex !== rightLogIndex) {
    return leftLogIndex > rightLogIndex ? -1 : 1;
  }

  return 0;
}

export function sortAnnouncementsByChainRecency(
  announcements: AnnouncementLog[]
): AnnouncementLog[] {
  return [...announcements].sort(compareAnnouncementsByChainRecency);
}

function assertStrictlyDescendingChainRecency(
  announcements: AnnouncementLog[]
): void {
  for (let index = 1; index < announcements.length; index += 1) {
    if (
      compareAnnouncementsByChainRecency(
        announcements[index - 1],
        announcements[index]
      ) >= 0
    ) {
      throw new Error(
        'Subgraph pages must preserve strict chain recency within the requested block range'
      );
    }
  }
}

function assertPageDoesNotViolateGlobalChainRecency({
  currentPage,
  previousOldestAnnouncement
}: {
  currentPage: AnnouncementLog[];
  previousOldestAnnouncement?: AnnouncementLog;
}): void {
  if (!previousOldestAnnouncement || currentPage.length === 0) {
    return;
  }

  const newestAnnouncementInCurrentPage = currentPage[0];
  if (
    compareAnnouncementsByChainRecency(
      newestAnnouncementInCurrentPage,
      previousOldestAnnouncement
    ) < 0
  ) {
    throw new Error(
      'Subgraph pages must preserve strict chain recency across yielded batches'
    );
  }
}

function buildPageParams({
  caller,
  cursor,
  fromBlock,
  pageSize,
  schemeId,
  snapshotBlock,
  subgraphUrl,
  toBlock
}: ScanAnnouncementsForUserUsingSubgraphParams): GetAnnouncementsPageUsingSubgraphParams {
  const sharedParams = {
    caller,
    fromBlock,
    pageSize,
    schemeId,
    subgraphUrl,
    toBlock
  };

  if (cursor === undefined && snapshotBlock === undefined) {
    return sharedParams;
  }

  return {
    ...sharedParams,
    cursor,
    snapshotBlock
  };
}

export async function* scanAnnouncementsForUserUsingSubgraphWithPageFetcher(
  params: ScanAnnouncementsForUserUsingSubgraphParams,
  getPage: GetAnnouncementsPageUsingSubgraphFn = getAnnouncementsPageUsingSubgraph
): ScanAnnouncementsForUserUsingSubgraphReturnType {
  const {
    clientParams,
    includeList,
    excludeList,
    spendingPublicKey,
    viewingPrivateKey
  } = params;

  assertValidScanParams(params);

  const normalizedAddressFilters = normalizeAnnouncementAddressFilters({
    excludeList,
    includeList
  });
  const publicClient = announcementFiltersRequireTransactionLookup(
    normalizedAddressFilters
  )
    ? handleViemPublicClient(clientParams)
    : undefined;

  let pageParams = buildPageParams(params);
  let previousOldestAnnouncement: AnnouncementLog | undefined;

  try {
    while (true) {
      const page = await getPage(pageParams);
      const sortedPageAnnouncements = sortAnnouncementsByChainRecency(
        page.announcements
      );

      assertStrictlyDescendingChainRecency(sortedPageAnnouncements);
      assertPageDoesNotViolateGlobalChainRecency({
        currentPage: sortedPageAnnouncements,
        previousOldestAnnouncement
      });

      const announcements = await filterAnnouncementsForUserBatch({
        announcements: sortedPageAnnouncements,
        excludeList: normalizedAddressFilters.excludeList,
        includeList: normalizedAddressFilters.includeList,
        publicClient,
        spendingPublicKey,
        viewingPrivateKey
      });

      const batch: ScanAnnouncementsForUserUsingSubgraphBatch = {
        announcements,
        nextCursor: page.nextCursor,
        scannedCount: sortedPageAnnouncements.length,
        snapshotBlock: page.snapshotBlock
      };

      yield batch;

      previousOldestAnnouncement =
        sortedPageAnnouncements[sortedPageAnnouncements.length - 1] ??
        previousOldestAnnouncement;

      if (!page.nextCursor) {
        return;
      }

      pageParams = {
        ...pageParams,
        cursor: page.nextCursor,
        snapshotBlock: page.snapshotBlock
      };
    }
  } catch (error) {
    throw new ScanAnnouncementsForUserUsingSubgraphError(
      'Failed to scan announcements from the subgraph',
      error
    );
  }
}

function scanAnnouncementsForUserUsingSubgraph(
  params: ScanAnnouncementsForUserUsingSubgraphParams
): ScanAnnouncementsForUserUsingSubgraphReturnType {
  return scanAnnouncementsForUserUsingSubgraphWithPageFetcher(params);
}

export default scanAnnouncementsForUserUsingSubgraph;
