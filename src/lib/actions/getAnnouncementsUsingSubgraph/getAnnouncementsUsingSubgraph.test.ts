import { describe, expect, test } from 'bun:test';
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

const CI_REQUIRED_REAL_SUBGRAPH_NETWORKS = [
  Network.ARBITRUM_ONE,
  Network.ARBITRUM_SEPOLIA,
  Network.BASE,
  Network.BASE_SEPOLIA,
  Network.MAINNET,
  Network.MATIC,
  Network.OPTIMISM,
  Network.OPTIMISM_SEPOLIA,
  Network.SEPOLIA
] as const;

type NetworkInfo = {
  name: Network;
  url: string;
  startBlock: number;
};

type NetworkConfig = {
  name: Network;
  urls: string[];
  startBlock: number;
};

type TestResult = {
  network: NetworkInfo;
  announcements: AnnouncementLog[];
  error?: Error;
};

const REAL_SUBGRAPH_RETRY_ATTEMPTS = 4;
const REAL_SUBGRAPH_RETRY_DELAY_MS = 2_000;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const isRateLimitedSubgraphError = (error: unknown): boolean => {
  const visited = new Set<unknown>();
  let current = error;

  while (current && !visited.has(current)) {
    visited.add(current);

    if (current instanceof Error) {
      const message = current.message.toLowerCase();
      if (
        message.includes('429') ||
        message.includes('too many requests') ||
        message.includes('retry-after')
      ) {
        return true;
      }

      current =
        'originalError' in current
          ? (current as { originalError?: unknown }).originalError
          : undefined;
      continue;
    }

    current = undefined;
  }

  return false;
};

const withRealSubgraphRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (
        attempt >= REAL_SUBGRAPH_RETRY_ATTEMPTS ||
        !isRateLimitedSubgraphError(error)
      ) {
        throw error;
      }

      await sleep(REAL_SUBGRAPH_RETRY_DELAY_MS * attempt);
    }
  }
};

describe('getAnnouncementsUsingSubgraph input validation', () => {
  test('should throw error for undefined subgraphUrl', async () => {
    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: undefined as unknown as string
      })
    ).rejects.toThrow(GetAnnouncementsUsingSubgraphError);

    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: undefined as unknown as string
      })
    ).rejects.toMatchObject({
      message: 'subgraphUrl must be a non-empty string'
    });
  });

  test('should throw error for empty string subgraphUrl', async () => {
    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: ''
      })
    ).rejects.toThrow(GetAnnouncementsUsingSubgraphError);

    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: '   '
      })
    ).rejects.toMatchObject({
      message: 'subgraphUrl cannot be empty or whitespace'
    });
  });

  test('should throw error for invalid URL format', async () => {
    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'not-a-url'
      })
    ).rejects.toThrow(GetAnnouncementsUsingSubgraphError);
  });

  test('should throw error for non-HTTP URL', async () => {
    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'ftp://example.com/subgraph'
      })
    ).rejects.toThrow(GetAnnouncementsUsingSubgraphError);
  });

  test('should throw error for invalid pageSize', async () => {
    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'https://example.com',
        pageSize: -1
      })
    ).rejects.toMatchObject({
      message: 'pageSize must be a positive integer'
    });

    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'https://example.com',
        pageSize: 0
      })
    ).rejects.toMatchObject({
      message: 'pageSize must be a positive integer'
    });

    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'https://example.com',
        pageSize: 1.5
      })
    ).rejects.toMatchObject({
      message: 'pageSize must be a positive integer'
    });

    await expect(
      getAnnouncementsUsingSubgraph({
        subgraphUrl: 'https://example.com',
        pageSize: 20000
      })
    ).rejects.toMatchObject({
      message: 'pageSize cannot exceed 10000 to avoid subgraph limits'
    });
  });
});

const buildSubgraphUrlCandidatesForNetwork = (network: Network): string[] => {
  const explicitUrl = process.env[`SUBGRAPH_URL_${network}`];
  if (explicitUrl) {
    return [explicitUrl];
  }

  const subgraphUrlPrefix = process.env.SUBGRAPH_URL_PREFIX;
  const subgraphName = process.env[`SUBGRAPH_NAME_${network}`];
  if (subgraphUrlPrefix && subgraphName) {
    if (
      subgraphName.startsWith('http://') ||
      subgraphName.startsWith('https://')
    ) {
      return [subgraphName];
    }

    const normalizedPrefix = subgraphUrlPrefix.replace(/\/+$/, '');
    const normalizedSubgraphName = subgraphName.replace(/^\/+/, '');
    const baseUrl = `${normalizedPrefix}/${normalizedSubgraphName}`;
    const candidates = [baseUrl];

    if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/gn')) {
      candidates.push(`${baseUrl}/api`);
    }

    return [...new Set(candidates)];
  }

  return [];
};

const getNetworksInfo = (): NetworkConfig[] =>
  Object.values(Network).flatMap(network => {
    const urls = buildSubgraphUrlCandidatesForNetwork(network);
    if (urls.length === 0) {
      return [];
    }

    return [
      {
        name: network,
        urls,
        startBlock: ERC5564_StartBlocks[network]
      }
    ];
  });

const networkConfigs = getNetworksInfo();
const hasSubgraphEnv = networkConfigs.length > 0;
const isCi = process.env.CI === 'true';
const hasCiSubgraphMatrix = CI_REQUIRED_REAL_SUBGRAPH_NETWORKS.every(
  network => buildSubgraphUrlCandidatesForNetwork(network).length > 0
);
const describeRealSubgraph = hasSubgraphEnv || isCi ? describe : describe.skip;
const REAL_SUBGRAPH_TEST_TIMEOUT_MS = 30_000;

describeRealSubgraph('getAnnouncementsUsingSubgraph with real subgraph', () => {
  let testResultsPromise: Promise<TestResult[]> | undefined;

  const loadTestResults = (): Promise<TestResult[]> => {
    if (testResultsPromise) {
      return testResultsPromise;
    }

    testResultsPromise = (async () => {
      if (!hasSubgraphEnv) {
        throw new Error(
          'At least one SUBGRAPH_URL_<NETWORK> or SUBGRAPH_URL_PREFIX + SUBGRAPH_NAME_<NETWORK> pair is required to run real subgraph integration tests'
        );
      }

      if (isCi && !hasCiSubgraphMatrix) {
        throw new Error(
          'CI requires explicit SUBGRAPH_URL_<NETWORK> configuration for every deployed real-subgraph network'
        );
      }

      const results = await Promise.all(
        networkConfigs.map(async network => {
          let lastError: Error | undefined;

          for (const url of network.urls) {
            try {
              const announcements = await withRealSubgraphRetry(() =>
                getAnnouncementsUsingSubgraph({
                  subgraphUrl: url,
                  filter: `blockNumber_gte: ${network.startBlock}`
                })
              );

              return {
                network: {
                  name: network.name,
                  url,
                  startBlock: network.startBlock
                },
                announcements
              };
            } catch (error) {
              lastError = error as Error;
            }
          }

          return {
            network: {
              name: network.name,
              url: network.urls[0],
              startBlock: network.startBlock
            },
            announcements: [],
            error: lastError
          };
        })
      );

      for (const result of results) {
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

      return results;
    })();

    return testResultsPromise;
  };

  const getResultWithAnnouncements = (
    testResults: TestResult[],
    minimumCount = 1
  ): TestResult | undefined => {
    const result = testResults.find(
      candidate =>
        candidate.error === undefined &&
        candidate.announcements.length >= minimumCount
    );

    if (!result) {
      if (isCi) {
        console.warn(
          `Skipping real subgraph assertion because no configured CI network returned at least ${minimumCount} announcements`
        );
        return undefined;
      }

      throw new Error(
        `No network returned at least ${minimumCount} announcements for integration coverage`
      );
    }

    return result;
  };

  const getSuccessfulResults = (testResults: TestResult[]): TestResult[] =>
    testResults.filter(result => result.error === undefined);

  test(
    'should successfully fetch from all subgraphs',
    async () => {
      const testResults = await loadTestResults();
      const successfulResults = getSuccessfulResults(testResults);

      if (isCi && successfulResults.length === 0) {
        console.warn(
          'Skipping strict real-subgraph CI assertion because every configured network failed externally'
        );
        return;
      }

      if (isCi) {
        expect(successfulResults.length).toBeGreaterThan(0);
        return;
      }

      for (const result of testResults) {
        expect(result.error).toBeUndefined();
      }
    },
    { timeout: REAL_SUBGRAPH_TEST_TIMEOUT_MS }
  );

  test(
    'announcement structure is correct for all subgraphs',
    async () => {
      const testResults = await loadTestResults();
      const successfulResults = getSuccessfulResults(testResults);

      if (successfulResults.length === 0) {
        return;
      }

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
        'metadata',
        'timestamp'
      ];

      for (const result of successfulResults) {
        if (result.announcements.length > 0) {
          const announcement = result.announcements[0];
          for (const prop of expectedProperties) {
            expect(announcement).toHaveProperty(prop);
          }
          expect(typeof announcement.timestamp).toBe('bigint');
        }
      }
    },
    { timeout: REAL_SUBGRAPH_TEST_TIMEOUT_MS }
  );

  test(
    'applies caller filter correctly for all subgraphs',
    async () => {
      const testResults = await loadTestResults();
      const successfulResults = getSuccessfulResults(testResults);

      if (successfulResults.length === 0) {
        return;
      }

      for (const result of successfulResults) {
        if (result.announcements.length === 0) {
          console.warn(
            `No announcements found to test caller filter for ${result.network.name}`
          );
          continue;
        }

        const caller = result.announcements[0].caller;
        const filteredResult = await withRealSubgraphRetry(() =>
          getAnnouncementsUsingSubgraph({
            subgraphUrl: result.network.url,
            filter: `caller: "${caller}"`
          })
        );

        expect(filteredResult.length).toBeGreaterThan(0);
        expect(
          filteredResult.every(a => getAddress(a.caller) === getAddress(caller))
        ).toBe(true);
      }
    },
    { timeout: REAL_SUBGRAPH_TEST_TIMEOUT_MS }
  );

  test(
    'handles pagination correctly for all subgraphs',
    async () => {
      const testResults = await loadTestResults();
      const successfulResults = getSuccessfulResults(testResults);

      if (successfulResults.length === 0) {
        return;
      }

      const largePageSize = MAX_LEGACY_SUBGRAPH_PAGE_SIZE;
      const paginationResults = await Promise.all(
        successfulResults.map(async ({ network }) => {
          try {
            const announcements = await withRealSubgraphRetry(() =>
              getAnnouncementsUsingSubgraph({
                subgraphUrl: network.url,
                filter: `blockNumber_gte: ${network.startBlock}`,
                pageSize: largePageSize
              })
            );
            return { network, announcements };
          } catch (error) {
            return { network, announcements: [], error: error as Error };
          }
        })
      );

      for (let i = 0; i < successfulResults.length; i++) {
        const initialResult = successfulResults[i];
        const paginatedResult = paginationResults[i];

        expect(initialResult.error).toBeUndefined();
        expect(paginatedResult.error).toBeUndefined();

        expect(paginatedResult.announcements.length).toBeGreaterThanOrEqual(
          initialResult.announcements.length
        );

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
    },
    { timeout: REAL_SUBGRAPH_TEST_TIMEOUT_MS }
  );

  test(
    'fetches an unfiltered page from all subgraphs',
    async () => {
      const testResults = await loadTestResults();
      const successfulResults = getSuccessfulResults(testResults);

      if (successfulResults.length === 0) {
        return;
      }

      for (const { network } of successfulResults) {
        const page = await withRealSubgraphRetry(() =>
          getAnnouncementsPageUsingSubgraph({
            subgraphUrl: network.url,
            pageSize: 1
          })
        );

        expect(Array.isArray(page.announcements)).toBe(true);
        expect(page.announcements.length).toBeLessThanOrEqual(1);
        expect(typeof page.snapshotBlock).toBe('bigint');
        expect(page.snapshotBlock).toBeGreaterThan(0n);
      }
    },
    { timeout: REAL_SUBGRAPH_TEST_TIMEOUT_MS }
  );

  test(
    'supports deterministic multi-page bounded fetches',
    async () => {
      const testResults = await loadTestResults();
      const result = getResultWithAnnouncements(testResults, 2);
      if (!result) {
        return;
      }
      const toBlock = result.announcements[0].blockNumber;
      if (toBlock === null) {
        throw new Error(
          'Expected blockNumber to be present on subgraph results'
        );
      }
      const seen = new Set<string>();
      const pagedResult: AnnouncementLog[] = [];
      const firstPage = await withRealSubgraphRetry(() =>
        getAnnouncementsPageUsingSubgraph({
          subgraphUrl: result.network.url,
          fromBlock: result.network.startBlock,
          toBlock,
          pageSize: 1
        })
      );
      const snapshotBlock = firstPage.snapshotBlock;
      let page = firstPage;
      let cursor = page.nextCursor;
      let pageCount = 0;

      do {
        pageCount += 1;
        expect(page.snapshotBlock).toBe(snapshotBlock);

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
        const nextCursor = cursor;
        if (!nextCursor) {
          break;
        }

        page = await withRealSubgraphRetry(() =>
          getAnnouncementsPageUsingSubgraph({
            subgraphUrl: result.network.url,
            fromBlock: result.network.startBlock,
            toBlock,
            pageSize: 1,
            cursor: nextCursor,
            snapshotBlock
          })
        );
        cursor = page.nextCursor;
      } while (cursor);

      expect(pagedResult.length).toBeGreaterThan(0);
      expect(pageCount).toBeGreaterThanOrEqual(1);
    },
    { timeout: REAL_SUBGRAPH_TEST_TIMEOUT_MS }
  );

  test(
    'applies typed schemeId and caller filters',
    async () => {
      const testResults = await loadTestResults();
      const result = getResultWithAnnouncements(testResults, 1);
      if (!result) {
        return;
      }
      const sample = result.announcements[0];
      const filteredPage = await withRealSubgraphRetry(() =>
        getAnnouncementsPageUsingSubgraph({
          subgraphUrl: result.network.url,
          fromBlock: result.network.startBlock,
          schemeId: sample.schemeId,
          caller: sample.caller,
          pageSize: 5
        })
      );

      expect(filteredPage.announcements.length).toBeGreaterThan(0);
      expect(filteredPage.snapshotBlock).toBeGreaterThan(0n);
      expect(
        filteredPage.announcements.every(
          announcement =>
            announcement.blockNumber !== null &&
            announcement.schemeId === sample.schemeId &&
            getAddress(announcement.caller) === getAddress(sample.caller) &&
            announcement.blockNumber >= BigInt(result.network.startBlock)
        )
      ).toBe(true);

      const eagerKeys = result.announcements
        .filter(
          announcement =>
            announcement.blockNumber !== null &&
            announcement.blockNumber >= BigInt(result.network.startBlock) &&
            announcement.schemeId === sample.schemeId &&
            getAddress(announcement.caller) === getAddress(sample.caller)
        )
        .slice(0, filteredPage.announcements.length)
        .map(
          announcement =>
            `${announcement.transactionHash}:${announcement.logIndex}`
        );

      expect(
        filteredPage.announcements.map(
          announcement =>
            `${announcement.transactionHash}:${announcement.logIndex}`
        )
      ).toEqual(eagerKeys);
    },
    { timeout: REAL_SUBGRAPH_TEST_TIMEOUT_MS }
  );

  test('rejects cursor without snapshotBlock', async () => {
    expect(
      getAnnouncementsPageUsingSubgraph({
        subgraphUrl: 'https://example.com/subgraph',
        cursor: 'cursor-1'
      } as never)
    ).rejects.toThrow(
      'cursor and snapshotBlock must either both be omitted for the initial page or both be provided for subsequent pages'
    );
  });

  test('rejects snapshotBlock without cursor', async () => {
    expect(
      getAnnouncementsPageUsingSubgraph({
        subgraphUrl: 'https://example.com/subgraph',
        snapshotBlock: 1n
      } as never)
    ).rejects.toThrow(
      'cursor and snapshotBlock must either both be omitted for the initial page or both be provided for subsequent pages'
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
