import { GraphQLClient } from 'graphql-request';
import { validateSubgraphUrl } from '../../../utils/validation/validateSubgraphUrl';
import type { AnnouncementLog } from '../getAnnouncements/types';
import {
  convertSubgraphEntityToAnnouncementLog,
  fetchAnnouncementsBatch
} from './subgraphHelpers';
import {
  GetAnnouncementsUsingSubgraphError,
  type GetAnnouncementsUsingSubgraphParams,
  type GetAnnouncementsUsingSubgraphReturnType
} from './types';

/**
 * Validates input parameters for getAnnouncementsUsingSubgraph function.
 *
 * @param subgraphUrl - The subgraph URL to validate
 * @param pageSize - The page size to validate
 * @throws {GetAnnouncementsUsingSubgraphError} If any parameter is invalid
 */
function validateGetAnnouncementsParams(
  subgraphUrl: string,
  pageSize: number
): void {
  // Validate subgraphUrl using shared utility
  validateSubgraphUrl(subgraphUrl, GetAnnouncementsUsingSubgraphError);

  // Validate pageSize
  if (
    typeof pageSize !== 'number' ||
    pageSize <= 0 ||
    !Number.isInteger(pageSize)
  ) {
    throw new GetAnnouncementsUsingSubgraphError(
      'pageSize must be a positive integer'
    );
  }

  if (pageSize > 10000) {
    throw new GetAnnouncementsUsingSubgraphError(
      'pageSize cannot exceed 10000 to avoid subgraph limits'
    );
  }
}

/**
 * Fetches announcement data from a specified subgraph URL.
 *
 * Supports filtering results based on a filter string that looks like:
 *   "
 *    blockNumber_gte: 123456789
 *    caller: "0x123456789"
 *   "
 *
 * `pageSize` can also be adjusted to optimize performance. The legacy eager
 * helper keeps the historical default value of 1000 for backward compatibility.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.subgraphUrl - The URL of the subgraph to query.
 * @param {string} [params.filter=''] - Optional filter string for the query.
 * @param {number} [params.pageSize=1000] - Number of items to fetch per page.
 *
 * @returns {Promise<AnnouncementLog[]>} A promise that resolves to an array of AnnouncementLog objects.
 * The return value here is the same as the `getAnnouncements` function to be able to seamlessly fallback to fetching via logs
 * if the subgraph is not available.
 *
 * @throws {GetAnnouncementsUsingSubgraphError} If there's an issue fetching the announcements.
 */
async function getAnnouncementsUsingSubgraph({
  subgraphUrl,
  filter = '',
  pageSize = 1000
}: GetAnnouncementsUsingSubgraphParams): Promise<GetAnnouncementsUsingSubgraphReturnType> {
  // Validate input parameters
  validateGetAnnouncementsParams(subgraphUrl, pageSize);
  const client = new GraphQLClient(subgraphUrl);
  const allAnnouncements: AnnouncementLog[] = [];

  try {
    let cursor: string | undefined;

    do {
      const { announcements, nextCursor } = await fetchAnnouncementsBatch({
        client,
        cursor,
        filter: filter || undefined,
        pageSize
      });

      allAnnouncements.push(
        ...announcements.map(convertSubgraphEntityToAnnouncementLog)
      );
      cursor = nextCursor;
    } while (cursor);
  } catch (error) {
    throw new GetAnnouncementsUsingSubgraphError(
      'Failed to fetch announcements from the subgraph',
      error
    );
  }

  return allAnnouncements;
}

export default getAnnouncementsUsingSubgraph;
export { GetAnnouncementsUsingSubgraphError };
