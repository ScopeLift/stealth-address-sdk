import type { GraphQLClient } from 'graphql-request';
import { ERC5564_CONTRACT } from '../../../config';
import type { AnnouncementLog } from '../getAnnouncements/types';
import type { SubgraphAnnouncementEntity } from './types';

export type PaginationVariables = {
  first: number;
  skip: number;
};

export async function* fetchPages<T>({
  client,
  gqlQuery,
  pageSize,
  entity
}: {
  client: GraphQLClient;
  gqlQuery: string;
  pageSize: number;
  entity: 'announcements'; // The name of the entity to fetch from the subgraph
}): AsyncGenerator<T[], void, undefined> {
  let skip = 0;
  let moreData = true;

  while (moreData) {
    const variables = {
      first: pageSize,
      skip
    };
    try {
      const response = await client.request<{ [key: string]: T[] }>(
        gqlQuery,
        variables
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
