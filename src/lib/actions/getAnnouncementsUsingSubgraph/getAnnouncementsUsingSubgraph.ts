import { GraphQLClient } from 'graphql-request';
import type { AnnouncementLog } from '../getAnnouncements/types';
import {
  convertSubgraphEntityToAnnouncementLog,
  fetchPages
} from './subgraphHelpers';
import type {
  AnnouncementSubgraphQueryVariables,
  GetAnnouncementsUsingSubgraphParams,
  GetAnnouncementsUsingSubgraphReturnType,
  SubgraphAnnouncementEntity
} from './types';

async function getAnnouncementsUsingSubgraph({
  subgraphUrl,
  fromBlock,
  toBlock,
  filterOptions,
  pageSize = 1000
}: GetAnnouncementsUsingSubgraphParams): Promise<GetAnnouncementsUsingSubgraphReturnType> {
  const client = new GraphQLClient(subgraphUrl);

  const gqlQuery = `
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

  const variables: AnnouncementSubgraphQueryVariables = {
    fromBlock: fromBlock ? Number(fromBlock) : undefined,
    toBlock: toBlock ? Number(toBlock) : undefined,
    caller: filterOptions?.caller
  };

  const allAnnouncements: AnnouncementLog[] = [];

  for await (const batch of fetchPages<
    SubgraphAnnouncementEntity,
    AnnouncementSubgraphQueryVariables
  >({
    client,
    gqlQuery,
    variables,
    pageSize,
    entity: 'announcements'
  })) {
    const announcements = batch.map(convertSubgraphEntityToAnnouncementLog);
    allAnnouncements.push(...announcements);
  }

  return allAnnouncements;
}

export default getAnnouncementsUsingSubgraph;