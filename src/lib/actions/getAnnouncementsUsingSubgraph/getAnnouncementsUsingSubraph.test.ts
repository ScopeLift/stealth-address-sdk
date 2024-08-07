import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { getAddress } from 'viem';
import { ERC5564_StartBlocks } from '../../../config/startBlocks';
import type { AnnouncementLog } from '../getAnnouncements/types';
import getAnnouncementsUsingSubgraph from './getAnnouncementsUsingSubgraph';
import { fetchPages } from './subgraphHelpers';
import { GetAnnouncementsUsingSubgraphError } from './types';

describe('getAnnouncementsUsingSubgraph with real subgraph', () => {
  const subgraphUrl = process.env.SUBGRAPH_URL;
  if (!subgraphUrl) throw new Error('SUBGRAPH_URL not set in env');

  const fromBlock = ERC5564_StartBlocks.SEPOLIA;
  let result: AnnouncementLog[];

  // Restore the original implementation of fetchPages
  beforeEach(async () => {
    mock.module('./subgraphHelpers', () => ({
      fetchPages
    }));
  });

  beforeAll(async () => {
    try {
      result = await getAnnouncementsUsingSubgraph({
        subgraphUrl,
        filter: `
          blockNumber_gte: ${fromBlock}
        `
      });
    } catch (error) {
      console.error(`Failed to fetch announcements: ${error}`);
      throw error;
    }
  });

  test('fetches announcements successfully', () => {
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('announcement structure is correct', () => {
    const announcement = result[0];
    expect(announcement).toHaveProperty('blockNumber');
    expect(announcement).toHaveProperty('blockHash');
    expect(announcement).toHaveProperty('transactionIndex');
    expect(announcement).toHaveProperty('removed');
    expect(announcement).toHaveProperty('address');
    expect(announcement).toHaveProperty('data');
    expect(announcement).toHaveProperty('topics');
    expect(announcement).toHaveProperty('transactionHash');
    expect(announcement).toHaveProperty('logIndex');
    expect(announcement).toHaveProperty('schemeId');
    expect(announcement).toHaveProperty('stealthAddress');
    expect(announcement).toHaveProperty('caller');
    expect(announcement).toHaveProperty('ephemeralPubKey');
    expect(announcement).toHaveProperty('metadata');
  });

  test('applies caller filter correctly', async () => {
    if (result.length === 0) {
      console.warn('No announcements found to test caller filter');
      return;
    }

    const caller = result[0].caller;
    const filteredResult = await getAnnouncementsUsingSubgraph({
      subgraphUrl,
      filter: `
        caller: "${caller}"
      `,
      pageSize: 100
    });

    expect(filteredResult.length).toBeGreaterThan(0);
    expect(
      filteredResult.every(a => getAddress(a.caller) === getAddress(caller))
    ).toBe(true);
  });

  test('handles pagination correctly', async () => {
    const smallPageSize = 10;
    const pagedResult = await getAnnouncementsUsingSubgraph({
      subgraphUrl,
      filter: `
        blockNumber_gte: ${fromBlock}
      `,
      pageSize: smallPageSize
    });

    expect(pagedResult.length).toBe(result.length);
    expect(pagedResult).toEqual(result);
  });

  test('should throw GetAnnouncementsUsingSubgraphError on fetch failure', async () => {
    const mockFetchPages = mock(() => ({
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.resolve({ done: true, value: undefined })
      })
    }));

    mock.module('./subgraphHelpers', () => ({
      fetchPages: mockFetchPages
    }));

    const mockError = new Error('Fetch failed');
    mockFetchPages.mockImplementation(() => {
      throw mockError;
    });

    expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'http://example.com/subgraph'
      })
    ).rejects.toBeInstanceOf(GetAnnouncementsUsingSubgraphError);

    expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'http://example.com/subgraph'
      })
    ).rejects.toMatchObject({
      message: 'Failed to fetch announcements from the subgraph',
      originalError: mockError
    });
  });
});
