import { GraphQLClient } from 'graphql-request';

export class GetLatestSubgraphIndexedBlockError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'GetLatestSubgraphIndexedBlockError';
  }
}

export type GetLatestSubgraphIndexedBlockParams = {
  subgraphUrl: string;
};

/**
 * Gets the latest block number that has been indexed by the subgraph.
 *
 * This helper function queries the subgraph's _meta endpoint to retrieve
 * the latest block number that has been processed and indexed. This is useful
 * for determining the freshness of subgraph data and ensuring you're working
 * with up-to-date information.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.subgraphUrl - The URL of the subgraph to query.
 *
 * @returns {Promise<bigint>} A promise that resolves to the latest indexed block number.
 *
 * @throws {GetLatestSubgraphIndexedBlockError} If there's an issue fetching the block number.
 *
 * @example
 * ```typescript
 * import { getLatestSubgraphIndexedBlock } from 'stealth-address-sdk';
 * 
 * const latestBlock = await getLatestSubgraphIndexedBlock({
 *   subgraphUrl: 'https://api.thegraph.com/subgraphs/name/your-subgraph'
 * });
 * console.log(`Latest indexed block: ${latestBlock}`);
 * ```
 */
async function getLatestSubgraphIndexedBlock({
  subgraphUrl
}: GetLatestSubgraphIndexedBlockParams): Promise<bigint> {
  const client = new GraphQLClient(subgraphUrl);
  
  const gqlQuery = `
    query GetLatestIndexedBlock {
      _meta {
        block {
          number
        }
      }
    }
  `;

  try {
    const response = await client.request<{
      _meta: {
        block: {
          number: number;
        };
      };
    }>(gqlQuery);

    const blockNumber = response._meta?.block?.number;
    
    if (blockNumber === undefined || blockNumber === null) {
      throw new GetLatestSubgraphIndexedBlockError(
        'Failed to retrieve block number from subgraph meta response'
      );
    }

    return BigInt(blockNumber);
  } catch (error) {
    if (error instanceof GetLatestSubgraphIndexedBlockError) {
      throw error;
    }
    
    throw new GetLatestSubgraphIndexedBlockError(
      'Failed to fetch latest indexed block from subgraph',
      error
    );
  }
}

export default getLatestSubgraphIndexedBlock;