import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { GraphQLClient } from 'graphql-request';
import getLatestSubgraphIndexedBlock, {
  GetLatestSubgraphIndexedBlockError,
  type SubgraphMetaResponse
} from '../getLatestSubgraphIndexedBlock';

// Mock GraphQLClient
const mockRequest = mock();
mock.module('graphql-request', () => ({
  GraphQLClient: mock().mockImplementation(() => ({
    request: mockRequest
  }))
}));

describe('getLatestSubgraphIndexedBlock', () => {
  const validSubgraphUrl =
    'https://api.thegraph.com/subgraphs/name/test/subgraph';

  beforeEach(() => {
    mockRequest.mockClear();
  });

  describe('input validation', () => {
    test('should throw error for undefined subgraphUrl', async () => {
      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: undefined as unknown as string
        })
      ).rejects.toThrow(GetLatestSubgraphIndexedBlockError);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: undefined as unknown as string
        })
      ).rejects.toMatchObject({
        message: 'subgraphUrl must be a non-empty string'
      });
    });

    test('should throw error for empty string subgraphUrl', async () => {
      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: ''
        })
      ).rejects.toThrow(GetLatestSubgraphIndexedBlockError);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: '   '
        })
      ).rejects.toMatchObject({
        message: 'subgraphUrl cannot be empty or whitespace'
      });
    });

    test('should throw error for invalid URL format', async () => {
      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: 'not-a-url'
        })
      ).rejects.toThrow(GetLatestSubgraphIndexedBlockError);
    });

    test('should throw error for non-HTTP URL', async () => {
      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: 'ftp://example.com/subgraph'
        })
      ).rejects.toThrow(GetLatestSubgraphIndexedBlockError);
    });

    test('should accept valid HTTP and HTTPS URLs', async () => {
      const validResponse: SubgraphMetaResponse = {
        _meta: {
          block: {
            number: 12345,
            hash: '0xabc123',
            timestamp: 1234567890
          },
          hasIndexingErrors: false
        }
      };

      mockRequest.mockResolvedValue(validResponse);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: 'http://example.com/subgraph'
        })
      ).resolves.toBe(12345n);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: 'https://example.com/subgraph'
        })
      ).resolves.toBe(12345n);
    });
  });

  describe('successful responses', () => {
    test('should return correct block number for valid response with number', async () => {
      const mockResponse: SubgraphMetaResponse = {
        _meta: {
          block: {
            number: 12345,
            hash: '0xabc123',
            timestamp: 1234567890
          },
          hasIndexingErrors: false
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await getLatestSubgraphIndexedBlock({
        subgraphUrl: validSubgraphUrl
      });

      expect(result).toBe(12345n);
    });

    test('should return correct block number for valid response with string number', async () => {
      const mockResponse: SubgraphMetaResponse = {
        _meta: {
          block: {
            number: '67890',
            hash: '0xdef456',
            timestamp: '1234567890'
          },
          hasIndexingErrors: false
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await getLatestSubgraphIndexedBlock({
        subgraphUrl: validSubgraphUrl
      });

      expect(result).toBe(67890n);
    });

    test('should handle genesis block (block 0)', async () => {
      const mockResponse: SubgraphMetaResponse = {
        _meta: {
          block: {
            number: 0,
            hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
            timestamp: 0
          },
          hasIndexingErrors: false
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await getLatestSubgraphIndexedBlock({
        subgraphUrl: validSubgraphUrl
      });

      expect(result).toBe(0n);
    });

    test('should handle large block numbers', async () => {
      const largeBlockNumber = 999999999999999;
      const mockResponse: SubgraphMetaResponse = {
        _meta: {
          block: {
            number: largeBlockNumber,
            hash: '0xabc123',
            timestamp: 1234567890
          },
          hasIndexingErrors: false
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await getLatestSubgraphIndexedBlock({
        subgraphUrl: validSubgraphUrl
      });

      expect(result).toBe(BigInt(largeBlockNumber));
    });

    test('should handle response with optional fields missing', async () => {
      const mockResponse: SubgraphMetaResponse = {
        _meta: {
          block: {
            number: 12345
          }
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await getLatestSubgraphIndexedBlock({
        subgraphUrl: validSubgraphUrl
      });

      expect(result).toBe(12345n);
    });
  });

  describe('response validation errors', () => {
    test('should throw error for missing _meta field', async () => {
      mockRequest.mockResolvedValue({});

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Invalid response: missing _meta field'
      });
    });

    test('should throw error for missing block field', async () => {
      mockRequest.mockResolvedValue({
        _meta: {}
      });

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Invalid response: missing _meta.block field'
      });
    });

    test('should throw error for missing block number', async () => {
      mockRequest.mockResolvedValue({
        _meta: {
          block: {}
        }
      });

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Invalid response: missing block number'
      });
    });

    test('should throw error for invalid block number (NaN)', async () => {
      mockRequest.mockResolvedValue({
        _meta: {
          block: {
            number: 'not-a-number'
          }
        }
      });

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Invalid response: block number must be a non-negative number'
      });
    });

    test('should throw error for negative block number', async () => {
      mockRequest.mockResolvedValue({
        _meta: {
          block: {
            number: -1
          }
        }
      });

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Invalid response: block number must be a non-negative number'
      });
    });

    test('should throw error for subgraph with indexing errors', async () => {
      mockRequest.mockResolvedValue({
        _meta: {
          block: {
            number: 12345
          },
          hasIndexingErrors: true
        }
      });

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Subgraph has indexing errors'
      });
    });

    test('should throw error for null response', async () => {
      mockRequest.mockResolvedValue(null);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Invalid response: expected object'
      });
    });
  });

  describe('network and GraphQL errors', () => {
    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      mockRequest.mockRejectedValue(timeoutError);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Request timed out'
      });
    });

    test('should handle GraphQL errors', async () => {
      const graphqlError = new Error('GraphQL error: Invalid query');
      mockRequest.mockRejectedValue(graphqlError);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'GraphQL query failed'
      });
    });

    test('should handle network errors', async () => {
      const networkError = new Error('fetch failed');
      mockRequest.mockRejectedValue(networkError);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Network error while querying subgraph'
      });
    });

    test('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      mockRequest.mockRejectedValue(genericError);

      await expect(
        getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        })
      ).rejects.toMatchObject({
        message: 'Failed to get latest indexed block from subgraph'
      });
    });

    test('should preserve original error context', async () => {
      const originalError = new Error('Original error message');
      mockRequest.mockRejectedValue(originalError);

      try {
        await getLatestSubgraphIndexedBlock({
          subgraphUrl: validSubgraphUrl
        });
      } catch (error) {
        expect(error).toBeInstanceOf(GetLatestSubgraphIndexedBlockError);
        expect(
          (error as GetLatestSubgraphIndexedBlockError).originalError
        ).toBe(originalError);
      }
    });
  });

  describe('GraphQL client usage', () => {
    test('should create client with correct URL', async () => {
      const mockResponse: SubgraphMetaResponse = {
        _meta: {
          block: {
            number: 12345
          }
        }
      };

      mockRequest.mockResolvedValue(mockResponse);

      await getLatestSubgraphIndexedBlock({
        subgraphUrl: validSubgraphUrl
      });

      expect(GraphQLClient).toHaveBeenCalledWith(validSubgraphUrl);
    });
  });
});