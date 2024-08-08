import { beforeAll, describe, expect, test } from 'bun:test';
import { getAddress } from 'viem';
import { ERC5564_StartBlocks } from '../../../config/startBlocks';
import type { AnnouncementLog } from '../getAnnouncements/types';
import getAnnouncementsUsingSubgraph from './getAnnouncementsUsingSubgraph';
import { GetAnnouncementsUsingSubgraphError } from './types';

enum Network {
  ARBITRUM_ONE = 'ARBITRUM_ONE',
  ARBITRUM_SEPOLIA = 'ARBITRUM_SEPOLIA',
  BASE = 'BASE',
  BASE_SEPOLIA = 'BASE_SEPOLIA',
  HOLESKY = 'HOLESKY',
  MAINNET = 'MAINNET',
  MATIC = 'MATIC',
  OPTIMISM = 'OPTIMISM',
  OPTIMISM_SEPOLIA = 'OPTIMISM_SEPOLIA',
  SEPOLIA = 'SEPOLIA'
}

type NetworkInfo = {
  name: Network;
  url: string;
  startBlock: number;
};

type TestResult = {
  network: NetworkInfo;
  announcements: AnnouncementLog[];
  error?: Error;
};

const checkEnvVars = () => {
  if (!process.env.SUBGRAPH_NAME_ARBITRUM_ONE)
    throw new Error('SUBGRAPH_NAME_ARBITRUM_ONE not set in env');
  if (!process.env.SUBGRAPH_NAME_ARBITRUM_SEPOLIA)
    throw new Error('SUBGRAPH_NAME_ARBITRUM_SEPOLIA not set in env');
  if (!process.env.SUBGRAPH_NAME_BASE)
    throw new Error('SUBGRAPH_NAME_BASE not set in env');
  if (!process.env.SUBGRAPH_NAME_BASE_SEPOLIA)
    throw new Error('SUBGRAPH_NAME_BASE_SEPOLIA not set in env');
  if (!process.env.SUBGRAPH_NAME_HOLESKY)
    throw new Error('SUBGRAPH_NAME_HOLESKY not set in env');
  if (!process.env.SUBGRAPH_NAME_MAINNET)
    throw new Error('SUBGRAPH_NAME_MAINNET not set in env');
  if (!process.env.SUBGRAPH_NAME_MATIC)
    throw new Error('SUBGRAPH_NAME_MATIC not set in env');
  if (!process.env.SUBGRAPH_NAME_OPTIMISM)
    throw new Error('SUBGRAPH_NAME_OPTIMISM not set in env');
  if (!process.env.SUBGRAPH_NAME_OPTIMISM_SEPOLIA)
    throw new Error('SUBGRAPH_NAME_OPTIMISM_SEPOLIA not set in env');
  if (!process.env.SUBGRAPH_NAME_SEPOLIA)
    throw new Error('SUBGRAPH_NAME_SEPOLIA not set in env');
};

const getNetworksInfo = () => {
  checkEnvVars();

  if (!process.env.SUBGRAPH_URL_PREFIX)
    throw new Error('SUBGRAPH_URL_PREFIX not set in env');

  const networks: NetworkInfo[] = Object.values(Network)
    .map(network => {
      const subgraphName = process.env[`SUBGRAPH_NAME_${network}`];
      const url = `${process.env.SUBGRAPH_URL_PREFIX}/${subgraphName}/api`;
      const startBlock = ERC5564_StartBlocks[network];

      return {
        name: network,
        url,
        startBlock
      };
    })
    .filter((network): network is NetworkInfo => network !== null);

  if (networks.length === 0) {
    throw new Error('No SUBGRAPH_NAME_* env vars set');
  }

  return networks;
};

const networks = getNetworksInfo();

describe('getAnnouncementsUsingSubgraph with real subgraph', () => {
  let testResults: TestResult[] = [];

  beforeAll(async () => {
    testResults = await Promise.all(
      networks.map(async network => {
        try {
          const announcements = await getAnnouncementsUsingSubgraph({
            subgraphUrl: network.url,
            filter: `blockNumber_gte: ${network.startBlock}`
          });
          return { network, announcements };
        } catch (error) {
          return { network, announcements: [], error: error as Error };
        }
      })
    );

    // Log results after all fetches are complete
    for (const result of testResults) {
      if (result.error) {
        console.error(
          `❌ Failed to fetch from ${result.network.name}: ${result.network.url}`
        );
        console.error(`   Error: ${result.error.message}`);
      } else {
        console.log(
          `✅ Successfully fetched from ${result.network.name}: ${result.network.url}`
        );
        console.log(
          `   Number of announcements: ${result.announcements.length}`
        );
      }
    }
  });

  test('should successfully fetch from all subgraphs', () => {
    for (const result of testResults) {
      expect(result.error).toBeUndefined();
    }
  });

  test('announcement structure is correct for all subgraphs', () => {
    const expectedProperties = [
      'blockNumber',
      'blockHash',
      'transactionIndex',
      'removed',
      'address',
      'data',
      'topics',
      'transactionHash',
      'logIndex',
      'schemeId',
      'stealthAddress',
      'caller',
      'ephemeralPubKey',
      'metadata'
    ];

    for (const result of testResults) {
      if (result.announcements.length > 0) {
        const announcement = result.announcements[0];
        for (const prop of expectedProperties) {
          expect(announcement).toHaveProperty(prop);
        }
      }
    }
  });

  test('applies caller filter correctly for all subgraphs', async () => {
    for (const result of testResults) {
      if (result.announcements.length === 0) {
        console.warn(
          `No announcements found to test caller filter for ${result.network.name}`
        );
        continue;
      }

      const caller = result.announcements[0].caller;
      const filteredResult = await getAnnouncementsUsingSubgraph({
        subgraphUrl: result.network.url,
        filter: `caller: "${caller}"`
      });

      expect(filteredResult.length).toBeGreaterThan(0);
      expect(
        filteredResult.every(a => getAddress(a.caller) === getAddress(caller))
      ).toBe(true);
    }
  });

  test('handles pagination correctly for all subgraphs', async () => {
    const largePageSize = 10000;
    const paginationPromises = testResults.map(async result => {
      const pagedResult = await getAnnouncementsUsingSubgraph({
        subgraphUrl: result.network.url,
        filter: `blockNumber_gte: ${result.network.startBlock}`,
        pageSize: largePageSize
      });

      expect(pagedResult.length).toBeGreaterThanOrEqual(
        result.announcements.length
      );
      expect(pagedResult.slice(0, result.announcements.length)).toEqual(
        result.announcements
      );
    });

    await Promise.all(paginationPromises);
  });

  test('should throw GetAnnouncementsUsingSubgraphError on fetch failure', async () => {
    expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'http://example.com/invalid-subgraph'
      })
    ).rejects.toThrow(GetAnnouncementsUsingSubgraphError);

    expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'http://example.com/invalid-subgraph'
      })
    ).rejects.toMatchObject({
      message: 'Failed to fetch announcements from the subgraph'
    });
  });
});
