import { GraphQLClient } from 'graphql-request';
import type { AnnouncementLog } from '../getAnnouncements/types';
import {
  convertSubgraphEntityToAnnouncementLog,
  fetchPages
} from './subgraphHelpers';
import {
  GetAnnouncementsUsingSubgraphError,
  type GetAnnouncementsUsingSubgraphParams,
  type GetAnnouncementsUsingSubgraphReturnType,
  type SubgraphAnnouncementEntity
} from './types';

/**
 * Fetches announcement data from a specified subgraph URL.
 *
 * Supports filtering results based on a filter string that looks like:
 *   "
 *    blockNumber_gte: 123456789
 *    caller: "0x123456789"
 *   "
 *
 * `pageSize` can also be adjusted to optimize performance and/or align with the subgraph's pagination limits.
 * The default value is 1000, which is a common maximum allowed by the subgraph providers.
 * If the subgraph provider has a higher limit, it can be adjusted accordingly.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.subgraphUrl - The URL of the subgraph to query.
 * @param {string} [params.filter=''] - Optional filter string for the query.
 * @param {number} [params.pageSize=1000] - Number of items to fetch per page.
 *
 * @returns {Promise<AnnouncementLog[]>} A promise that resolves to an array of AnnouncementLog objects.
 * The return value here is the same as the `getAnnouncements` function to be able to seamlessly fallback to fetching via logs
 * if the subgraph is not available.
 *
 * @throws {GetAnnouncementsUsingSubgraphError} If there's an issue fetching the announcements.
 */
async function getAnnouncementsUsingSubgraph({
  subgraphUrl,
  filter = '',
  pageSize = 1000
}: GetAnnouncementsUsingSubgraphParams): Promise<GetAnnouncementsUsingSubgraphReturnType> {
  const client = new GraphQLClient(subgraphUrl);
  const gqlQuery = `
  query GetAnnouncements($first: Int, $id_lt: ID) {
    announcements(
      where: { __WHERE_CLAUSE__ }
      first: $first,
      orderBy: id,
      orderDirection: desc
    ) {
      id
      blockNumber
      blockHash
      caller
      data
      ephemeralPubKey
      logIndex
      metadata
      removed
      schemeId
      stealthAddress
      topics
      transactionHash
      transactionIndex
    }
  }
`;

  const allAnnouncements: AnnouncementLog[] = [];

  try {
    for await (const batch of fetchPages<SubgraphAnnouncementEntity>({
      client,
      gqlQuery,
      pageSize,
      filter,
      entity: 'announcements'
    })) {
      allAnnouncements.push(
        ...batch.map(convertSubgraphEntityToAnnouncementLog)
      );
    }
  } catch (error) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Failed to fetch announcements from the subgraph',
      error
    );
  }

  return allAnnouncements;
}

export default getAnnouncementsUsingSubgraph;
