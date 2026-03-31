import { GraphQLClient } from 'graphql-request';
import {
  convertSubgraphEntityToAnnouncementLog,
  fetchAnnouncementsPage
} from './subgraphHelpers';
import {
  type GetAnnouncementsPageUsingSubgraphParams,
  type GetAnnouncementsPageUsingSubgraphReturnType,
  type GetAnnouncementsPageUsingSubgraphUnsafeParams,
  GetAnnouncementsUsingSubgraphError
} from './types';

function assertValidPageParams({
  cursor,
  snapshotBlock
}: Pick<
  GetAnnouncementsPageUsingSubgraphUnsafeParams,
  'cursor' | 'snapshotBlock'
>): void {
  if ((cursor === undefined) !== (snapshotBlock === undefined)) {
    throw new Error(
      'cursor and snapshotBlock must either both be omitted for the initial page or both be provided for subsequent pages'
    );
  }
}

/**
 * Fetches a single deterministic page of announcements from a subgraph.
 *
 * The initial page omits `cursor` and `snapshotBlock`. Every subsequent page
 * must provide both values returned by the initial page so the scan continues
 * through the same pinned subgraph snapshot.
 */
async function getAnnouncementsPageUsingSubgraph({
  caller,
  cursor,
  fromBlock,
  pageSize = 999,
  schemeId,
  snapshotBlock,
  subgraphUrl,
  toBlock
}: GetAnnouncementsPageUsingSubgraphParams): Promise<GetAnnouncementsPageUsingSubgraphReturnType> {
  const client = new GraphQLClient(subgraphUrl);
  assertValidPageParams({
    cursor,
    snapshotBlock
  });

  try {
    const {
      announcements,
      nextCursor,
      snapshotBlock: resolvedSnapshotBlock
    } = await fetchAnnouncementsPage({
      caller,
      client,
      cursor,
      fromBlock,
      pageSize,
      schemeId,
      snapshotBlock,
      toBlock
    });

    return {
      announcements: announcements.map(convertSubgraphEntityToAnnouncementLog),
      nextCursor,
      snapshotBlock: resolvedSnapshotBlock
    };
  } catch (error) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Failed to fetch announcements from the subgraph',
      error
    );
  }
}

export default getAnnouncementsPageUsingSubgraph;
