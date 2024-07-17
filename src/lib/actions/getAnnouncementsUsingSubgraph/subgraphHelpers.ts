import type { GraphQLClient } from 'graphql-request';
import type { SubgraphAnnouncementEntity } from './types';
import type { AnnouncementLog } from '../getAnnouncements/types';
import { ERC5564_CONTRACT } from '../../../config';

export type PaginationVariables = {
  first: number;
  skip: number;
};

export async function* fetchPages<T, V extends Record<string, unknown>>({
  client,
  gqlQuery,
  variables,
  pageSize,
  entity
}: {
  client: GraphQLClient;
  gqlQuery: string;
  variables: V;
  pageSize: number;
  entity: 'announcementEntities'; // The name of the entity to fetch from the subgraph
}): AsyncGenerator<T[], void, undefined> {
  let skip = 0;
  let moreData = true;

  while (moreData) {
    const currentVariables = {
      ...variables,
      first: pageSize,
      skip
    };
    try {
      const response = await client.request<{ [key: string]: T[] }>(
        gqlQuery,
        currentVariables
      );

      yield response[entity];

      if (response[entity].length < pageSize) {
        moreData = false;
      } else {
        skip += pageSize;
      }
    } catch (error) {
      console.error(`Failed to fetch data: ${error}`);
      throw error;
    }
  }
}

export function convertSubgraphEntityToAnnouncementLog(
  entity: SubgraphAnnouncementEntity
): AnnouncementLog {
  return {
    address: ERC5564_CONTRACT.SEPOLIA, // Contract address is the same for all chains
    blockHash: entity.blockHash as `0x${string}`,
    blockNumber: BigInt(entity.block),
    logIndex: Number(entity.logIndex),
    removed: entity.removed,
    transactionHash: entity.transactionHash as `0x${string}`,
    transactionIndex: Number(entity.transactionIndex),
    topics: entity.topics as [`0x${string}`, ...`0x${string}`[]] | [],
    data: entity.data as `0x${string}`,
    schemeId: BigInt(entity.schemeId),
    stealthAddress: `0x${entity.stealthAddress}`,
    caller: `0x${entity.caller}`,
    ephemeralPubKey: `0x${entity.ephemeralPubKey}`,
    metadata: `0x${entity.metadata}`
  };
}
