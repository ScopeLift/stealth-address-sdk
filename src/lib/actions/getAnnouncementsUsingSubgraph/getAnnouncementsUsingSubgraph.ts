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
  filter = '',
  pageSize = 1000
}: GetAnnouncementsUsingSubgraphParams): Promise<GetAnnouncementsUsingSubgraphReturnType> {
  const client = new GraphQLClient(subgraphUrl);
  const gqlQuery = `
  query GetAnnouncements($first: Int, $id_lt: ID) {
    announcements(
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

  const allAnnouncements: AnnouncementLog[] = [];

  try {
    for await (const batch of fetchPages<SubgraphAnnouncementEntity>({
      client,
      gqlQuery,
      pageSize,
      filter,
      entity: 'announcements'
    })) {
      allAnnouncements.push(
        ...batch.map(convertSubgraphEntityToAnnouncementLog)
      );
    }
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    throw error;
  }

  return allAnnouncements;
}

export default getAnnouncementsUsingSubgraph;
