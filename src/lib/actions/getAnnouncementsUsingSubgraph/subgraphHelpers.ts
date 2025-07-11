import type { GraphQLClient } from 'graphql-request';
import { getAddress } from 'viem';
import { ERC5564_CONTRACT_ADDRESS } from '../../../config';
import type { AnnouncementLog } from '../getAnnouncements/types';
import type {
  GetAnnouncementsPageUsingSubgraphUnsafeParams,
  SubgraphAnnouncementEntity
} from './types';

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
      timestamp
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
    announcements: SubgraphAnnouncementEntity[];
  }>(finalQuery, variables);
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
    logIndex: Number.parseInt(entity.logIndex, 10),
    removed: entity.removed,
    transactionHash: entity.transactionHash as `0x${string}`,
    transactionIndex: Number.parseInt(entity.transactionIndex, 10),
    topics: entity.topics as [`0x${string}`, ...`0x${string}`[]] | [],
    data: entity.data as `0x${string}`,
    schemeId: BigInt(entity.schemeId),
    stealthAddress: entity.stealthAddress as `0x${string}`,
    caller: entity.caller as `0x${string}`,
    ephemeralPubKey: entity.ephemeralPubKey as `0x${string}`,
    metadata: entity.metadata as `0x${string}`,
    timestamp: BigInt(entity.timestamp)
  };
}
