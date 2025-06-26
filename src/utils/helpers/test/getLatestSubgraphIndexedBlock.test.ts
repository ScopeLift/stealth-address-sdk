import { describe, expect, test } from 'bun:test';
import getLatestSubgraphIndexedBlock, {
  GetLatestSubgraphIndexedBlockError
} from '../getLatestSubgraphIndexedBlock';

describe('getLatestSubgraphIndexedBlock', () => {
  test('should export the function correctly', () => {
    expect(typeof getLatestSubgraphIndexedBlock).toBe('function');
  });

  test('should export the error class correctly', () => {
    expect(GetLatestSubgraphIndexedBlockError).toBeDefined();
    const error = new GetLatestSubgraphIndexedBlockError('test error');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('GetLatestSubgraphIndexedBlockError');
    expect(error.message).toBe('test error');
  });

  test('should fetch latest indexed block from real subgraph', async () => {
    const subgraphUrl =
      'https://subgraph.satsuma-prod.com/760e79467576/scopelift/stealth-address-erc-base/api';

    const result = await getLatestSubgraphIndexedBlock({
      subgraphUrl
    });

    // Should return a bigint block number
    expect(typeof result).toBe('bigint');
    // Should be a reasonable block number (greater than 0)
    expect(result).toBeGreaterThan(0n);
    // Should be less than a very large number (sanity check)
    expect(result).toBeLessThan(1000000000n);
  });

  test('should throw error for invalid subgraph URL', async () => {
    const invalidUrl = 'https://invalid-subgraph-url.com/api';

    await expect(
      getLatestSubgraphIndexedBlock({
        subgraphUrl: invalidUrl
      })
    ).rejects.toThrow(GetLatestSubgraphIndexedBlockError);
  });

  test('should throw error for non-existent subgraph', async () => {
    const nonExistentUrl =
      'https://api.thegraph.com/subgraphs/name/non-existent-subgraph';

    await expect(
      getLatestSubgraphIndexedBlock({
        subgraphUrl: nonExistentUrl
      })
    ).rejects.toThrow(GetLatestSubgraphIndexedBlockError);
  });
});
