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
  subgraphUrl,
  toBlock
}: GetAnnouncementsPageUsingSubgraphParams): Promise<GetAnnouncementsPageUsingSubgraphReturnType> {
  const client = new GraphQLClient(subgraphUrl);

  try {
    const { announcements, nextCursor } = await fetchAnnouncementsPage({
      caller,
      client,
      cursor,
      fromBlock,
      pageSize,
      schemeId,
      toBlock
    });

    return {
      announcements: announcements.map(convertSubgraphEntityToAnnouncementLog),
      nextCursor
    };
  } catch (error) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Failed to fetch announcements from the subgraph',
      error
    );
  }
}

export default getAnnouncementsPageUsingSubgraph;
