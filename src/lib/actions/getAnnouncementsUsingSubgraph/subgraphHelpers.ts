import type { GraphQLClient } from 'graphql-request';
import { ERC5564_CONTRACT_ADDRESS } from '../../../config';
import type { AnnouncementLog } from '../getAnnouncements/types';
import type { SubgraphAnnouncementEntity } from './types';

export type PaginationVariables = {
  first: number;
  skip: number;
};

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
  const variables: { first: number; id_lt?: string } = {
    first: pageSize
  };
  if (lastId) {
    variables.id_lt = lastId;
  }

  const whereClause = [filter, lastId ? 'id_lt: $id_lt' : null]
    .filter(Boolean)
    .join(', ');

  const finalQuery = gqlQuery.replace('__WHERE_CLAUSE__', whereClause);

  try {
    const response = await client.request<{ [key: string]: T[] }>(
      finalQuery,
      variables
    );
    const batch = response[entity];

    if (batch.length === 0) {
      return;
    }

    yield batch;

    if (batch.length < pageSize) {
      return;
    }

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
