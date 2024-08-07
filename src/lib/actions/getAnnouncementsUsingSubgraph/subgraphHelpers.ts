import type { GraphQLClient } from 'graphql-request';
import { ERC5564_CONTRACT_ADDRESS } from '../../../config';
import type { AnnouncementLog } from '../getAnnouncements/types';
import type { SubgraphAnnouncementEntity } from './types';

/**
 * The necessary pagination variables for the subgraph query.
 */
export type PaginationVariables = {
  first: number;
  skip: number;
};

/**
 * Asynchronous generator function to fetch paginated data from a subgraph.
 *
 * This function fetches data in reverse chronological order (newest first) by using
 * the 'id_lt' parameter for pagination. It recursively calls itself to fetch all pages
 * of data, using the lastId parameter as the starting point for each subsequent page.
 *
 * @template T - The type of entities being fetched, must have an 'id' property.
 * @param {Object} params - The parameters for the fetch operation.
 * @param {GraphQLClient} params.client - The GraphQL client instance.
 * @param {string} params.gqlQuery - The GraphQL query string with a '__WHERE_CLAUSE__' placeholder.
 * @param {number} params.pageSize - The number of items to fetch per page.
 * @param {string} params.filter - Additional filter criteria for the query.
 * @param {string} params.entity - The name of the entity being queried. Currently only supports 'announcements'.
 * @param {string} [params.lastId] - The ID of the last item from the previous page, used for pagination.
 * @yields {T[]} An array of entities of type T for each page of results.
 * @throws {Error} If there's an error fetching the data from the subgraph.
 */
export async function* fetchPages<T extends { id: string }>({
  client,
  gqlQuery,
  pageSize,
  filter,
  entity,
  lastId
}: {
  client: GraphQLClient;
  gqlQuery: string;
  pageSize: number;
  filter: string;
  entity: 'announcements';
  lastId?: string;
}): AsyncGenerator<T[], void, unknown> {
  // Set up variables for the GraphQL query
  const variables: { first: number; id_lt?: string } = {
    first: pageSize
  };

  // If lastId is provided, set it as the upper bound for the pagination
  if (lastId) {
    variables.id_lt = lastId;
  }

  // Construct the WHERE clause for the GraphQL query
  const whereClause = [filter, lastId ? 'id_lt: $id_lt' : null]
    .filter(Boolean)
    .join(', ');

  // Replace the placeholder in the query with the constructed WHERE clause
  const finalQuery = gqlQuery.replace('__WHERE_CLAUSE__', whereClause);

  try {
    const response = await client.request<{ [key: string]: T[] }>(
      finalQuery,
      variables
    );
    const batch = response[entity];

    // If no results, end the generator
    if (batch.length === 0) {
      return;
    }

    yield batch;

    // If we've received fewer items than the page size, we're done
    if (batch.length < pageSize) {
      return;
    }

    // Recursively fetch the next page
    const newLastId = batch[batch.length - 1].id;
    yield* fetchPages({
      client,
      gqlQuery,
      pageSize,
      filter,
      entity,
      lastId: newLastId
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

/**
 * Converts a SubgraphAnnouncementEntity to an AnnouncementLog for interoperability
 * between `getAnnouncements` and `getAnnouncementsUsingSubgraph`.
 *
 * This function transforms the data structure returned by the subgraph into the
 * standardized AnnouncementLog format used throughout the SDK. It ensures consistency
 * in data representation regardless of whether announcements are fetched directly via logs
 * or via a subgraph.
 *
 * @param {SubgraphAnnouncementEntity} entity - The announcement entity from the subgraph.
 * @returns {AnnouncementLog} The converted announcement log in the standard format.
 */
export function convertSubgraphEntityToAnnouncementLog(
  entity: SubgraphAnnouncementEntity
): AnnouncementLog {
  return {
    address: ERC5564_CONTRACT_ADDRESS, // Contract address is the same for all chains
    blockHash: entity.blockHash as `0x${string}`,
    blockNumber: BigInt(entity.blockNumber),
    logIndex: Number(entity.logIndex),
    removed: entity.removed,
    transactionHash: entity.transactionHash as `0x${string}`,
    transactionIndex: Number(entity.transactionIndex),
    topics: entity.topics as [`0x${string}`, ...`0x${string}`[]] | [],
    data: entity.data as `0x${string}`,
    schemeId: BigInt(entity.schemeId),
    stealthAddress: entity.stealthAddress as `0x${string}`,
    caller: entity.caller as `0x${string}`,
    ephemeralPubKey: entity.ephemeralPubKey as `0x${string}`,
    metadata: entity.metadata as `0x${string}`
  };
}
