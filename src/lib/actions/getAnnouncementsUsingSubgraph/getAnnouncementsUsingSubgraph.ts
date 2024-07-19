import { GraphQLClient } from 'graphql-request';
import type { AnnouncementLog } from '../getAnnouncements/types';
import {
  convertSubgraphEntityToAnnouncementLog,
  fetchPages
} from './subgraphHelpers';
import type {
  GetAnnouncementsUsingSubgraphParams,
  GetAnnouncementsUsingSubgraphReturnType,
  SubgraphAnnouncementEntity
} from './types';

async function getAnnouncementsUsingSubgraph({
  subgraphUrl,
  filter = '', // A valid GraphQL filter string that looks like: `{ blockNumber_gte: 123456, caller: "0xAddress" }`
  pageSize = 1000
}: GetAnnouncementsUsingSubgraphParams): Promise<GetAnnouncementsUsingSubgraphReturnType> {
  const client = new GraphQLClient(subgraphUrl);

  const gqlQuery = `
    query GetAnnouncements($first: Int, $skip: Int) {
      announcements(
        where: ${filter},
        first: $first,
        skip: $skip,
        orderBy: blockNumber,
        orderDirection: asc
      ) 
      {
        blockNumber
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

  const allAnnouncements: AnnouncementLog[] = [];

  for await (const batch of fetchPages<SubgraphAnnouncementEntity>({
    client,
    gqlQuery,
    pageSize,
    entity: 'announcements'
  })) {
    const announcements = batch.map(convertSubgraphEntityToAnnouncementLog);
    allAnnouncements.push(...announcements);
  }

  return allAnnouncements;
}

export default getAnnouncementsUsingSubgraph;
