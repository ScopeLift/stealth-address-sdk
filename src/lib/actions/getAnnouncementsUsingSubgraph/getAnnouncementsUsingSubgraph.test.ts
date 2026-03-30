import { beforeAll, describe, expect, test } from 'bun:test';
import { getAddress } from 'viem';
import { ERC5564_StartBlocks } from '../../../config/startBlocks';
import type { AnnouncementLog } from '../getAnnouncements/types';
import getAnnouncementsPageUsingSubgraph from './getAnnouncementsPageUsingSubgraph';
import getAnnouncementsUsingSubgraph from './getAnnouncementsUsingSubgraph';
import { MAX_LEGACY_SUBGRAPH_PAGE_SIZE } from './subgraphHelpers';
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

const getSubgraphUrlForNetwork = (network: Network): string | undefined => {
  const explicitUrl = process.env[`SUBGRAPH_URL_${network}`];
  if (explicitUrl) {
    return explicitUrl;
  }

  const subgraphUrlPrefix = process.env.SUBGRAPH_URL_PREFIX;
  const subgraphName = process.env[`SUBGRAPH_NAME_${network}`];
  if (subgraphUrlPrefix && subgraphName) {
    return `${subgraphUrlPrefix}/${subgraphName}/api`;
  }

  return undefined;
};

const getNetworksInfo = (): NetworkInfo[] =>
  Object.values(Network).flatMap(network => {
    const url = getSubgraphUrlForNetwork(network);
    if (!url) {
      return [];
    }

    return [
      {
        name: network,
        url,
        startBlock: ERC5564_StartBlocks[network]
      }
    ];
  });

const networks = getNetworksInfo();
const hasSubgraphEnv = networks.length > 0;
const isCi = process.env.CI === 'true';
const hasCiSubgraphMatrix = Object.values(Network).every(network =>
  Boolean(getSubgraphUrlForNetwork(network))
);
const describeRealSubgraph = hasSubgraphEnv || isCi ? describe : describe.skip;

describeRealSubgraph('getAnnouncementsUsingSubgraph with real subgraph', () => {
  let testResults: TestResult[] = [];

  const getResultWithAnnouncements = (minimumCount = 1): TestResult => {
    const result = testResults.find(
      candidate =>
        candidate.error === undefined &&
        candidate.announcements.length >= minimumCount
    );

    if (!result) {
      throw new Error(
        `No network returned at least ${minimumCount} announcements for integration coverage`
      );
    }

    return result;
  };

  beforeAll(async () => {
    if (!hasSubgraphEnv) {
      throw new Error(
        'At least one SUBGRAPH_URL_<NETWORK> or SUBGRAPH_URL_PREFIX + SUBGRAPH_NAME_<NETWORK> pair is required to run real subgraph integration tests'
      );
    }

    if (isCi && !hasCiSubgraphMatrix) {
      throw new Error(
        'CI requires subgraph configuration for every network via SUBGRAPH_URL_<NETWORK> or SUBGRAPH_URL_PREFIX + SUBGRAPH_NAME_<NETWORK>'
      );
    }

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
    const largePageSize = MAX_LEGACY_SUBGRAPH_PAGE_SIZE;
    const paginationResults = await Promise.all(
      networks.map(async network => {
        try {
          const announcements = await getAnnouncementsUsingSubgraph({
            subgraphUrl: network.url,
            filter: `blockNumber_gte: ${network.startBlock}`,
            pageSize: largePageSize
          });
          return { network, announcements };
        } catch (error) {
          return { network, announcements: [], error: error as Error };
        }
      })
    );

    for (let i = 0; i < testResults.length; i++) {
      const initialResult = testResults[i];
      const paginatedResult = paginationResults[i];

      expect(initialResult.error).toBeUndefined();
      expect(paginatedResult.error).toBeUndefined();

      expect(paginatedResult.announcements.length).toBeGreaterThanOrEqual(
        initialResult.announcements.length
      );

      // Check that the paginated results contain at least all the announcements from the initial fetch
      const initialAnnouncementSet = new Set(
        initialResult.announcements.map(
          a => `${a.transactionHash}:${a.logIndex}`
        )
      );
      const paginatedAnnouncementSet = new Set(
        paginatedResult.announcements.map(
          a => `${a.transactionHash}:${a.logIndex}`
        )
      );

      for (const announcementKey of initialAnnouncementSet) {
        expect(paginatedAnnouncementSet.has(announcementKey)).toBe(true);
      }
    }
  });

  test('fetches an unfiltered page from all subgraphs', async () => {
    for (const network of networks) {
      const page = await getAnnouncementsPageUsingSubgraph({
        subgraphUrl: network.url,
        pageSize: 1
      });

      expect(Array.isArray(page.announcements)).toBe(true);
      expect(page.announcements.length).toBeLessThanOrEqual(1);
    }
  });

  test('supports deterministic multi-page bounded fetches', async () => {
    const result = getResultWithAnnouncements(2);
    const toBlock = result.announcements[0].blockNumber;
    if (toBlock === null) {
      throw new Error('Expected blockNumber to be present on subgraph results');
    }
    const eagerResult = await getAnnouncementsUsingSubgraph({
      subgraphUrl: result.network.url,
      filter: `blockNumber_gte: ${
        result.network.startBlock
      }, blockNumber_lte: ${toBlock.toString()}`,
      pageSize: 1
    });

    const seen = new Set<string>();
    const pagedResult: AnnouncementLog[] = [];
    let cursor: string | undefined;

    do {
      const page = await getAnnouncementsPageUsingSubgraph({
        subgraphUrl: result.network.url,
        fromBlock: result.network.startBlock,
        toBlock,
        pageSize: 1,
        cursor
      });

      for (const announcement of page.announcements) {
        if (announcement.blockNumber === null) {
          throw new Error(
            'Expected blockNumber to be present on paged results'
          );
        }

        const key = `${announcement.transactionHash}:${announcement.logIndex}`;
        expect(seen.has(key)).toBe(false);
        expect(announcement.blockNumber).toBeGreaterThanOrEqual(
          BigInt(result.network.startBlock)
        );
        expect(announcement.blockNumber).toBeLessThanOrEqual(toBlock);
        seen.add(key);
      }

      pagedResult.push(...page.announcements);
      cursor = page.nextCursor;
    } while (cursor);

    expect(
      pagedResult.map(
        announcement =>
          `${announcement.transactionHash}:${announcement.logIndex}`
      )
    ).toEqual(
      eagerResult.map(
        announcement =>
          `${announcement.transactionHash}:${announcement.logIndex}`
      )
    );
  });

  test('applies typed schemeId and caller filters', async () => {
    const result = getResultWithAnnouncements(1);
    const sample = result.announcements[0];
    const filteredPage = await getAnnouncementsPageUsingSubgraph({
      subgraphUrl: result.network.url,
      fromBlock: result.network.startBlock,
      schemeId: sample.schemeId,
      caller: sample.caller,
      pageSize: 5
    });

    expect(filteredPage.announcements.length).toBeGreaterThan(0);
    expect(
      filteredPage.announcements.every(
        announcement =>
          announcement.blockNumber !== null &&
          announcement.schemeId === sample.schemeId &&
          getAddress(announcement.caller) === getAddress(sample.caller) &&
          announcement.blockNumber >= BigInt(result.network.startBlock)
      )
    ).toBe(true);

    const eagerResult = await getAnnouncementsUsingSubgraph({
      subgraphUrl: result.network.url,
      filter: `blockNumber_gte: ${
        result.network.startBlock
      }, schemeId: "${sample.schemeId.toString()}", caller: "${sample.caller}"`,
      pageSize: 5
    });

    expect(
      filteredPage.announcements.map(
        announcement =>
          `${announcement.transactionHash}:${announcement.logIndex}`
      )
    ).toEqual(
      eagerResult
        .slice(0, filteredPage.announcements.length)
        .map(
          announcement =>
            `${announcement.transactionHash}:${announcement.logIndex}`
        )
    );
  });

  test('should throw GetAnnouncementsUsingSubgraphError on fetch failure', async () => {
    expect(
      getAnnouncementsPageUsingSubgraph({
        subgraphUrl: 'http://example.com/invalid-subgraph'
      })
    ).rejects.toThrow(GetAnnouncementsUsingSubgraphError);

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
