import { GraphQLClient } from 'graphql-request';
import type { AnnouncementLog } from '../getAnnouncements/types';
import { ERC5564_CONTRACT } from '../../../config';
import type {
  GetAnnouncementsUsingSubgraphParams,
  GetAnnouncementsUsingSubgraphReturnType,
  SubgraphAnnouncementEntity
} from './types';

export async function getAnnouncementsUsingSubgraph({
  subgraphUrl,
  fromBlock,
  toBlock,
  query
}: GetAnnouncementsUsingSubgraphParams): Promise<GetAnnouncementsUsingSubgraphReturnType> {
  const client = new GraphQLClient(subgraphUrl);

  const queryToUse =
    query ??
    `
    query GetAnnouncements($fromBlock: Int, $toBlock: Int) {
      announcementEntities(
        where: {
          block_gte: $fromBlock,
          block_lte: $toBlock
        }
      ) {
        block
        blockHash
        caller
        data
        ephemeralPubKey
        id
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

  const variables = {
    fromBlock: fromBlock ? Number(fromBlock) : undefined,
    toBlock: toBlock ? Number(toBlock) : undefined
  };

  const data = await client.request<{
    announcements: SubgraphAnnouncementEntity[];
  }>(queryToUse, variables);

  return data.announcements.map(convertSubgraphEntityToAnnouncementLog);
}

function convertSubgraphEntityToAnnouncementLog(
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
