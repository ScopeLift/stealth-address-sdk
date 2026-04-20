import type { GraphQLClient } from 'graphql-request';
import { getAddress } from 'viem';
import { ERC5564_CONTRACT_ADDRESS } from '../../../config';
import type { AnnouncementLog } from '../getAnnouncements/types';
import {
  GetAnnouncementsUsingSubgraphError,
  type SubgraphAnnouncementEntity
} from './types';
import type { GetAnnouncementsPageUsingSubgraphUnsafeParams } from './types';

// Cursor pagination is defined by the subgraph entity `id`, ordered descending.
// The page API carries the last returned `id` forward as an exclusive `id_lt`
// boundary, which is safe because `id` is unique per announcement entity.
export const GET_ANNOUNCEMENTS_SUBGRAPH_QUERY = `
  query GetAnnouncements($first: Int, $id_lt: ID) {
    announcements(
      __BLOCK_ARGUMENT__
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

const GET_SUBGRAPH_META_QUERY = `
  query GetSubgraphMeta {
    _meta {
      block {
        number
      }
    }
  }
`;

export const MAX_SUBGRAPH_PAGE_SIZE = 999;
export const MAX_LEGACY_SUBGRAPH_PAGE_SIZE = 1000;

type BuildAnnouncementsWhereClauseParams = Pick<
  GetAnnouncementsPageUsingSubgraphUnsafeParams,
  'caller' | 'fromBlock' | 'schemeId' | 'toBlock'
> & {
  cursor?: string;
  filter?: string;
};

function formatNonNegativeInteger(
  fieldName: string,
  value: bigint | number | string
): string {
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value)) {
      throw new Error(`${fieldName} must be a non-negative integer`);
    }
  } else if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${fieldName} must be a non-negative integer`);
    }
  } else if (value < 0n) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return value.toString();
}

function buildAnnouncementsQuery({
  snapshotBlock,
  whereClause
}: {
  snapshotBlock?: string;
  whereClause: string;
}): string {
  return GET_ANNOUNCEMENTS_SUBGRAPH_QUERY.replace(
    '__BLOCK_ARGUMENT__',
    snapshotBlock ? `block: { number: ${snapshotBlock} },` : ''
  ).replace('__WHERE_CLAUSE__', whereClause);
}

function normalizePageSize(pageSize: number, maxPageSize: number): number {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('pageSize must be a positive integer');
  }

  if (pageSize > maxPageSize) {
    throw new Error(`pageSize must be less than or equal to ${maxPageSize}`);
  }

  return pageSize;
}

function normalizeOptionalSnapshotBlock(
  snapshotBlock?: bigint | number
): string | undefined {
  if (snapshotBlock === undefined) {
    return undefined;
  }

  return formatNonNegativeInteger('snapshotBlock', snapshotBlock);
}

function assertStrictlyDescendingAnnouncementIds(
  announcements: SubgraphAnnouncementEntity[],
  cursor?: string
): void {
  let previousId = cursor;

  for (const announcement of announcements) {
    if (previousId !== undefined && announcement.id >= previousId) {
      throw new Error(
        'Subgraph announcements must be returned in strict descending id order'
      );
    }

    previousId = announcement.id;
  }
}

export function buildAnnouncementsWhereClause({
  caller,
  cursor,
  filter,
  fromBlock,
  schemeId,
  toBlock
}: BuildAnnouncementsWhereClauseParams): string {
  return [
    filter?.trim() || null,
    fromBlock !== undefined
      ? `blockNumber_gte: ${formatNonNegativeInteger('fromBlock', fromBlock)}`
      : null,
    toBlock !== undefined
      ? `blockNumber_lte: ${formatNonNegativeInteger('toBlock', toBlock)}`
      : null,
    schemeId !== undefined
      ? `schemeId: "${formatNonNegativeInteger('schemeId', schemeId)}"`
      : null,
    caller ? `caller: ${JSON.stringify(getAddress(caller))}` : null,
    cursor ? 'id_lt: $id_lt' : null
  ]
    .filter(Boolean)
    .join(', ');
}

async function resolveSnapshotBlock(client: GraphQLClient): Promise<string> {
  const response = await client.request<{
    _meta?: {
      block?: {
        number?: number | string | null;
      } | null;
    } | null;
  }>(GET_SUBGRAPH_META_QUERY);
  const snapshotBlock = response._meta?.block?.number;

  if (snapshotBlock === undefined || snapshotBlock === null) {
    throw new Error('Subgraph did not return a snapshot block');
  }

  return formatNonNegativeInteger('snapshotBlock', snapshotBlock);
}

function assertAnnouncementsResponse(response: unknown): asserts response is {
  announcements: SubgraphAnnouncementEntity[];
} {
  if (
    !response ||
    typeof response !== 'object' ||
    !('announcements' in response) ||
    !Array.isArray(response.announcements)
  ) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Subgraph did not return an announcements array'
    );
  }
}

async function requestAnnouncements({
  caller,
  client,
  cursor,
  filter,
  first,
  fromBlock,
  snapshotBlock,
  schemeId,
  toBlock
}: BuildAnnouncementsWhereClauseParams & {
  client: GraphQLClient;
  first: number;
  snapshotBlock?: string;
}): Promise<SubgraphAnnouncementEntity[]> {
  const variables: { first: number; id_lt?: string } = { first };

  if (cursor) {
    variables.id_lt = cursor;
  }

  const whereClause = buildAnnouncementsWhereClause({
    caller,
    cursor,
    filter,
    fromBlock,
    schemeId,
    toBlock
  });
  const finalQuery = buildAnnouncementsQuery({
    snapshotBlock,
    whereClause
  });
  const response = await client.request<{
    announcements?: SubgraphAnnouncementEntity[];
  }>(finalQuery, variables);
  assertAnnouncementsResponse(response);
  assertStrictlyDescendingAnnouncementIds(response.announcements, cursor);

  return response.announcements;
}

export async function fetchAnnouncementsPage({
  caller,
  client,
  cursor,
  filter,
  fromBlock,
  pageSize,
  snapshotBlock,
  schemeId,
  toBlock
}: BuildAnnouncementsWhereClauseParams & {
  client: GraphQLClient;
  pageSize: number;
  snapshotBlock?: bigint | number;
}): Promise<{
  announcements: SubgraphAnnouncementEntity[];
  nextCursor?: string;
  snapshotBlock: bigint;
}> {
  const normalizedPageSize = normalizePageSize(
    pageSize,
    MAX_SUBGRAPH_PAGE_SIZE
  );
  const resolvedSnapshotBlock =
    normalizeOptionalSnapshotBlock(snapshotBlock) ??
    (await resolveSnapshotBlock(client));
  const announcements = await requestAnnouncements({
    caller,
    client,
    cursor,
    filter,
    first: normalizedPageSize,
    fromBlock,
    snapshotBlock: resolvedSnapshotBlock,
    schemeId,
    toBlock
  });

  if (announcements.length < normalizedPageSize) {
    return {
      announcements,
      nextCursor: undefined,
      snapshotBlock: BigInt(resolvedSnapshotBlock)
    };
  }

  const lastAnnouncementId = announcements[announcements.length - 1]?.id;
  const nextCursor = lastAnnouncementId
    ? (
        await requestAnnouncements({
          client,
          cursor: lastAnnouncementId,
          filter,
          first: 1,
          caller,
          fromBlock,
          snapshotBlock: resolvedSnapshotBlock,
          schemeId,
          toBlock
        })
      ).length > 0
      ? lastAnnouncementId
      : undefined
    : undefined;

  return {
    announcements,
    nextCursor,
    snapshotBlock: BigInt(resolvedSnapshotBlock)
  };
}

export async function fetchAnnouncementsBatch({
  caller,
  client,
  cursor,
  filter,
  fromBlock,
  pageSize,
  schemeId,
  toBlock
}: BuildAnnouncementsWhereClauseParams & {
  client: GraphQLClient;
  pageSize: number;
}): Promise<{
  announcements: SubgraphAnnouncementEntity[];
  nextCursor?: string;
}> {
  const normalizedPageSize = normalizePageSize(
    pageSize,
    MAX_LEGACY_SUBGRAPH_PAGE_SIZE
  );
  const announcements = await requestAnnouncements({
    caller,
    client,
    cursor,
    filter,
    first: normalizedPageSize,
    fromBlock,
    schemeId,
    toBlock
  });
  const nextCursor =
    announcements.length === normalizedPageSize
      ? announcements[announcements.length - 1]?.id
      : undefined;

  return {
    announcements,
    nextCursor
  };
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

  // Validate hex strings (basic validation - just check they start with 0x)
  const hexFields = [
    'caller',
    'ephemeralPubKey',
    'stealthAddress',
    'transactionHash',
    'blockHash',
    'data',
    'metadata'
  ];

  for (const field of hexFields) {
    const value = entity[field as keyof SubgraphAnnouncementEntity];
    if (value && typeof value === 'string' && !value.startsWith('0x')) {
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
