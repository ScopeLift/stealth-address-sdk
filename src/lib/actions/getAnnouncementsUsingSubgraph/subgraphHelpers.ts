import type { GraphQLClient } from 'graphql-request';
import { ERC5564_CONTRACT_ADDRESS } from '../../../config';
import type { AnnouncementLog } from '../getAnnouncements/types';
import { GetAnnouncementsUsingSubgraphError } from './getAnnouncementsUsingSubgraph';
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
 * @param {string} params.entity - The name of the entity being queried.
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
  entity: string;
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
 * Validates a SubgraphAnnouncementEntity to ensure it has all required fields.
 *
 * @param entity - The entity to validate
 * @throws {GetAnnouncementsUsingSubgraphError} If required fields are missing or invalid
 */
function validateSubgraphAnnouncementEntity(
  entity: SubgraphAnnouncementEntity
): void {
  if (!entity.id) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Invalid announcement entity: missing id field'
    );
  }

  const requiredFields = [
    'blockNumber',
    'caller',
    'ephemeralPubKey',
    'metadata',
    'schemeId',
    'stealthAddress',
    'transactionHash'
  ];

  for (const field of requiredFields) {
    if (!entity[field as keyof SubgraphAnnouncementEntity]) {
      throw new GetAnnouncementsUsingSubgraphError(
        `Invalid announcement entity: missing required field '${field}'`
      );
    }
  }

  // Validate numeric fields
  if (
    entity.blockNumber &&
    (Number.isNaN(Number(entity.blockNumber)) || Number(entity.blockNumber) < 0)
  ) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Invalid announcement entity: blockNumber must be a non-negative number'
    );
  }

  if (
    entity.logIndex &&
    (Number.isNaN(Number(entity.logIndex)) || Number(entity.logIndex) < 0)
  ) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Invalid announcement entity: logIndex must be a non-negative number'
    );
  }

  if (
    entity.transactionIndex &&
    (Number.isNaN(Number(entity.transactionIndex)) ||
      Number(entity.transactionIndex) < 0)
  ) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Invalid announcement entity: transactionIndex must be a non-negative number'
    );
  }

  if (entity.schemeId && Number.isNaN(Number(entity.schemeId))) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Invalid announcement entity: schemeId must be a valid number'
    );
  }

  // Validate hex strings
  const hexFields = [
    'caller',
    'ephemeralPubKey',
    'stealthAddress',
    'transactionHash',
    'blockHash',
    'data',
    'metadata'
  ];
  const hexRegex = /^0x[0-9a-fA-F]*$/; // Allows for '0x' and valid hex characters

  for (const field of hexFields) {
    const value = entity[field as keyof SubgraphAnnouncementEntity];
    if (value && typeof value === 'string' && !hexRegex.test(value)) {
      throw new GetAnnouncementsUsingSubgraphError(
        `Invalid announcement entity: ${field} must be a valid hex string starting with '0x'`
      );
    }
  }
}

/**
 * Converts a SubgraphAnnouncementEntity to an AnnouncementLog for interoperability
 * between `getAnnouncements` and `getAnnouncementsUsingSubgraph`.
 *
 * This function transforms the data structure returned by the subgraph into the
 * standardized AnnouncementLog format used throughout the SDK. It ensures consistency
 * in data representation regardless of whether announcements are fetched directly via logs
 * or via a subgraph. Includes comprehensive validation of the entity data.
 *
 * @param {SubgraphAnnouncementEntity} entity - The announcement entity from the subgraph.
 * @returns {AnnouncementLog} The converted announcement log in the standard format.
 * @throws {Error} If the entity is missing required fields or has invalid data.
 */
export function convertSubgraphEntityToAnnouncementLog(
  entity: SubgraphAnnouncementEntity
): AnnouncementLog {
  // Validate the entity before conversion
  validateSubgraphAnnouncementEntity(entity);

  // After validation, we can safely assert that required fields exist
  const validatedEntity = entity as Required<
    Pick<
      SubgraphAnnouncementEntity,
      | 'blockNumber'
      | 'caller'
      | 'ephemeralPubKey'
      | 'metadata'
      | 'schemeId'
      | 'stealthAddress'
      | 'transactionHash'
    >
  > &
    SubgraphAnnouncementEntity;

  return {
    address: ERC5564_CONTRACT_ADDRESS, // Contract address is the same for all chains
    // Optional fields with fallbacks (correct)
    blockHash: (entity.blockHash ||
      '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
    logIndex: Number(entity.logIndex || 0),
    removed: entity.removed || false,
    transactionIndex: Number(entity.transactionIndex || 0),
    topics: (entity.topics || []) as [`0x${string}`, ...`0x${string}`[]] | [],
    data: (entity.data || '0x') as `0x${string}`,

    // Required fields (validation ensures they exist, so no fallbacks needed)
    blockNumber: BigInt(validatedEntity.blockNumber),
    transactionHash: validatedEntity.transactionHash as `0x${string}`,
    schemeId: BigInt(validatedEntity.schemeId),
    stealthAddress: validatedEntity.stealthAddress as `0x${string}`,
    caller: validatedEntity.caller as `0x${string}`,
    ephemeralPubKey: validatedEntity.ephemeralPubKey as `0x${string}`,
    metadata: validatedEntity.metadata as `0x${string}`
  };
}
