import { beforeAll, describe, expect, test } from 'bun:test';
import type { AnnouncementLog } from '../getAnnouncements/types';
import getAnnouncementsUsingSubgraph from './getAnnouncementsUsingSubgraph';

describe('getAnnouncementsUsingSubgraph with real subgraph', () => {
  const subgraphUrl = process.env.SUBGRAPH_URL;
  if (!subgraphUrl) throw new Error('SUBGRAPH_URL not set in env');

  const fromBlock = 5486597; // Sepolia announcer contract deploy block
  let result: AnnouncementLog[];

  beforeAll(async () => {
    result = await getAnnouncementsUsingSubgraph({
      subgraphUrl,
      fromBlock
    });
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

  test('fetches announcements within specified block range', async () => {
    const latestBlock = Math.max(...result.map(a => Number(a.blockNumber)));
    const midPoint = Math.floor((fromBlock + latestBlock) / 2);

    const firstHalf = await getAnnouncementsUsingSubgraph({
      subgraphUrl,
      fromBlock,
      toBlock: midPoint,
      pageSize: 100
    });

    const secondHalf = await getAnnouncementsUsingSubgraph({
      subgraphUrl,
      fromBlock: midPoint + 1,
      toBlock: latestBlock,
      pageSize: 100
    });

    expect(firstHalf.length + secondHalf.length).toBe(result.length);
    expect(
      Math.max(...firstHalf.map(a => Number(a.blockNumber)))
    ).toBeLessThanOrEqual(midPoint);
    expect(
      Math.min(...secondHalf.map(a => Number(a.blockNumber)))
    ).toBeGreaterThan(midPoint);
  });

  test('applies caller filter correctly', async () => {
    if (result.length === 0) {
      console.warn('No announcements found to test caller filter');
      return;
    }

    const caller = result[0].caller;
    const filteredResult = await getAnnouncementsUsingSubgraph({
      subgraphUrl,
      fromBlock,
      filterOptions: { caller },
      pageSize: 100
    });

    expect(filteredResult.length).toBeGreaterThan(0);
    expect(filteredResult.every(a => a.caller === caller)).toBe(true);
  });

  test('handles pagination correctly', async () => {
    const smallPageSize = 10;
    const pagedResult = await getAnnouncementsUsingSubgraph({
      subgraphUrl,
      fromBlock,
      pageSize: smallPageSize
    });

    expect(pagedResult.length).toBe(result.length);
    expect(pagedResult).toEqual(result);
  });
});
