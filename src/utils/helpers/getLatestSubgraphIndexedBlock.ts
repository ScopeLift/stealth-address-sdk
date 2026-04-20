import { GraphQLClient } from 'graphql-request';
import { validateSubgraphUrl } from '../validation/validateSubgraphUrl';

/**
 * Response structure for subgraph meta information.
 */
export type SubgraphMetaResponse = {
  _meta?: {
    block?: {
      number?: number | string;
      hash?: string;
      timestamp?: number | string;
    };
    deployment?: string;
    hasIndexingErrors?: boolean;
  };
};

/**
 * Parameters for getting the latest indexed block from a subgraph.
 */
export type GetLatestSubgraphIndexedBlockParams = {
  /** The URL of the subgraph to query */
  subgraphUrl: string;
};

/**
 * Return type for the latest indexed block information.
 */
export type GetLatestSubgraphIndexedBlockReturnType = bigint;

/**
 * Custom error class for getLatestSubgraphIndexedBlock function.
 */
export class GetLatestSubgraphIndexedBlockError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'GetLatestSubgraphIndexedBlockError';
  }
}

/**
 * Validates the GraphQL response from the subgraph meta query.
 *
 * @param response - The response to validate
 * @throws {GetLatestSubgraphIndexedBlockError} If the response is invalid
 */
function validateSubgraphMetaResponse(response: unknown): SubgraphMetaResponse {
  if (!response || typeof response !== 'object') {
    throw new GetLatestSubgraphIndexedBlockError(
      'Invalid response: expected object'
    );
  }

  const typedResponse = response as SubgraphMetaResponse;

  if (!typedResponse._meta) {
    throw new GetLatestSubgraphIndexedBlockError(
      'Invalid response: missing _meta field'
    );
  }

  if (!typedResponse._meta.block) {
    throw new GetLatestSubgraphIndexedBlockError(
      'Invalid response: missing _meta.block field'
    );
  }

  const blockNumber = typedResponse._meta.block.number;
  if (blockNumber === undefined || blockNumber === null) {
    throw new GetLatestSubgraphIndexedBlockError(
      'Invalid response: missing block number'
    );
  }

  // Validate block number is a valid number
  const numericBlockNumber =
    typeof blockNumber === 'string' ? Number(blockNumber) : blockNumber;
  if (Number.isNaN(numericBlockNumber) || numericBlockNumber < 0) {
    throw new GetLatestSubgraphIndexedBlockError(
      'Invalid response: block number must be a non-negative number'
    );
  }

  // Check for indexing errors
  if (typedResponse._meta.hasIndexingErrors === true) {
    throw new GetLatestSubgraphIndexedBlockError(
      'Subgraph has indexing errors'
    );
  }

  return typedResponse;
}

/**
 * Retrieves the latest block number indexed by a subgraph.
 *
 * This function queries the subgraph's `_meta` endpoint to get information about
 * the latest indexed block. It includes comprehensive validation of inputs and
 * responses, with detailed error handling for various failure scenarios.
 *
 * @param params - The parameters for the query
 * @param params.subgraphUrl - The URL of the subgraph to query
 *
 * @returns Promise that resolves to the latest indexed block number as bigint
 *
 * @throws {GetLatestSubgraphIndexedBlockError} When the query fails or response is invalid
 *
 * @example
 * ```typescript
 * const latestBlock = await getLatestSubgraphIndexedBlock({
 *   subgraphUrl: 'https://api.thegraph.com/subgraphs/name/example/subgraph'
 * });
 * console.log(`Latest indexed block: ${latestBlock}`);
 * ```
 */
export async function getLatestSubgraphIndexedBlock({
  subgraphUrl
}: GetLatestSubgraphIndexedBlockParams): Promise<GetLatestSubgraphIndexedBlockReturnType> {
  // Validate input parameters first, before creating client
  validateSubgraphUrl(subgraphUrl, GetLatestSubgraphIndexedBlockError);

  const client = new GraphQLClient(subgraphUrl);

  const query = `
    query GetSubgraphMeta {
      _meta {
        block {
          number
          hash
          timestamp
        }
        deployment
        hasIndexingErrors
      }
    }
  `;

  try {
    const response = await client.request<SubgraphMetaResponse>(query);

    // Validate the response structure and content
    const validatedResponse = validateSubgraphMetaResponse(response);

    // Extract and convert block number to bigint
    // Safe to access these fields since validation guarantees they exist
    const blockNumber = validatedResponse._meta?.block?.number;
    if (blockNumber === undefined || blockNumber === null) {
      throw new GetLatestSubgraphIndexedBlockError(
        'Invalid response: missing block number'
      );
    }
    const numericBlockNumber =
      typeof blockNumber === 'string' ? Number(blockNumber) : blockNumber;

    return BigInt(numericBlockNumber);
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof GetLatestSubgraphIndexedBlockError) {
      throw error;
    }

    // Handle timeout errors specifically by checking for AbortError
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('timeout'))
    ) {
      throw new GetLatestSubgraphIndexedBlockError('Request timed out', error);
    }

    // Handle GraphQL errors
    if (error instanceof Error && error.message.includes('GraphQL')) {
      throw new GetLatestSubgraphIndexedBlockError(
        'GraphQL query failed',
        error
      );
    }

    // Handle network errors
    if (
      error instanceof Error &&
      (error.message.includes('fetch') || error.message.includes('network'))
    ) {
      throw new GetLatestSubgraphIndexedBlockError(
        'Network error while querying subgraph',
        error
      );
    }

    // Generic error handling
    throw new GetLatestSubgraphIndexedBlockError(
      'Failed to get latest indexed block from subgraph',
      error
    );
  }
}

export default getLatestSubgraphIndexedBlock;
