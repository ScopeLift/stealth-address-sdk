import { GraphQLClient } from 'graphql-request';
import type {
  GetAnnouncementsUsingSubgraphParams,
  GetAnnouncementsUsingSubgraphReturnType,
  SubgraphAnnouncementEntity
} from './types';
import {
  convertSubgraphEntityToAnnouncementLog,
  fetchPages
} from './subgraphHelpers';
import type { AnnouncementLog } from '../getAnnouncements/types';

async function getAnnouncementsUsingSubgraph({
  subgraphUrl,
  fromBlock,
  toBlock,
  query,
  filterOptions,
  pageSize = 1000
}: GetAnnouncementsUsingSubgraphParams): Promise<GetAnnouncementsUsingSubgraphReturnType> {
  const client = new GraphQLClient(subgraphUrl);

  const gqlQuery =
    query ??
    `
    query GetAnnouncements($fromBlock: Int, $toBlock: Int, $first: Int, $skip: Int, $caller: String) {
      announcementEntities(
        where: {
          block_gte: $fromBlock,
          block_lte: $toBlock
          caller: $caller,
        },
        first: $first,
        skip: $skip,
        orderBy: block,
        orderDirection: asc
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
    toBlock: toBlock ? Number(toBlock) : undefined,
    caller: filterOptions?.caller
  };

  const allAnnouncements: AnnouncementLog[] = [];

  for await (const batch of fetchPages<SubgraphAnnouncementEntity>({
    client,
    gqlQuery,
    variables,
    pageSize,
    entity: 'announcementEntities'
  })) {
    const announcements = batch.map(convertSubgraphEntityToAnnouncementLog);
    allAnnouncements.push(...announcements);
  }

  return allAnnouncements;
}

export default getAnnouncementsUsingSubgraph;
