import { GraphQLClient } from 'graphql-request';
import {
  convertSubgraphEntityToAnnouncementLog,
  fetchAnnouncementsPage
} from './subgraphHelpers';
import {
  type GetAnnouncementsPageUsingSubgraphParams,
  type GetAnnouncementsPageUsingSubgraphReturnType,
  GetAnnouncementsUsingSubgraphError
} from './types';

/**
 * Fetches a single deterministic page of announcements from a subgraph.
 *
 * All scan-shaping options are optional. Omitting them fetches the newest page
 * of announcements for the provided subgraph URL.
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
