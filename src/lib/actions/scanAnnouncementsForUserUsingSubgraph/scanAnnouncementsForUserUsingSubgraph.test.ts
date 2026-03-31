import { describe, expect, test } from 'bun:test';
import { ERC5564_CONTRACT_ADDRESS } from '../../../config';
import { VALID_SCHEME_ID, generateStealthAddress } from '../../../utils/crypto';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import type { AnnouncementLog } from '../getAnnouncements/types';
import getAnnouncementsForUser from '../getAnnouncementsForUser/getAnnouncementsForUser';
import type { GetAnnouncementsPageUsingSubgraphParams } from '../getAnnouncementsUsingSubgraph/types';
import {
  compareAnnouncementsByChainRecency,
  scanAnnouncementsForUserUsingSubgraphWithPageFetcher,
  sortAnnouncementsByChainRecency
} from './scanAnnouncementsForUserUsingSubgraph';
import { ScanAnnouncementsForUserUsingSubgraphError } from './types';

const SCHEME_ID = VALID_SCHEME_ID.SCHEME_ID_1;

const allowedFrom = '0x00000000000000000000000000000000000000AA';
const secondAllowedFrom = '0x00000000000000000000000000000000000000BB';
const blockedFrom = '0x00000000000000000000000000000000000000CC';

const userKeys = setupTestStealthKeys(SCHEME_ID);
const alternateKeys = setupTestStealthKeys(SCHEME_ID);

function hex64(value: number): `0x${string}` {
  return `0x${value.toString(16).padStart(64, '0')}`;
}

function makeAnnouncement({
  blockNumber,
  from,
  isForUser,
  logIndex,
  sequence,
  transactionIndex
}: {
  blockNumber: number;
  from: `0x${string}`;
  isForUser: boolean;
  logIndex: number;
  sequence: number;
  transactionIndex: number;
}): AnnouncementLog {
  const { stealthAddress, ephemeralPublicKey, viewTag } =
    generateStealthAddress({
      stealthMetaAddressURI: isForUser
        ? userKeys.stealthMetaAddressURI
        : alternateKeys.stealthMetaAddressURI,
      schemeId: SCHEME_ID
    });

  const announcement: AnnouncementLog = {
    address: ERC5564_CONTRACT_ADDRESS,
    blockHash: hex64(sequence + 10_000),
    blockNumber: BigInt(blockNumber),
    caller: from,
    data: '0x',
    ephemeralPubKey: ephemeralPublicKey,
    logIndex,
    metadata: viewTag,
    removed: false,
    schemeId: BigInt(SCHEME_ID),
    stealthAddress,
    topics: [],
    transactionHash: hex64(sequence),
    transactionIndex
  };

  return announcement;
}

function createPublicClientForAnnouncements(
  announcements: AnnouncementLog[],
  fromByHash?: Record<`0x${string}`, `0x${string}`>
) {
  const lookup = fromByHash
    ? new Map<`0x${string}`, `0x${string}`>(
        Object.entries(fromByHash) as Array<[`0x${string}`, `0x${string}`]>
      )
    : new Map<`0x${string}`, `0x${string}`>(
        announcements.map(announcement => {
          if (!announcement.transactionHash) {
            throw new Error(
              'Expected mock announcements to include transaction hashes'
            );
          }

          return [announcement.transactionHash, announcement.caller];
        })
      );

  return {
    getTransaction: async ({ hash }: { hash: `0x${string}` }) => {
      const from = lookup.get(hash);
      if (!from) {
        throw new Error(`Missing mock sender for ${hash}`);
      }

      return {
        from
      };
    }
  };
}

function createPageFetcher(
  pages: Array<{
    announcements: AnnouncementLog[];
    nextCursor?: string;
    snapshotBlock: bigint;
  }>
) {
  const calls: GetAnnouncementsPageUsingSubgraphParams[] = [];

  return {
    calls,
    fetcher: async (params: GetAnnouncementsPageUsingSubgraphParams) => {
      calls.push(params);
      const nextPage = pages.shift();
      if (!nextPage) {
        throw new Error('Unexpected page fetch');
      }

      return nextPage;
    }
  };
}

async function collectAll<T>(
  generator: AsyncGenerator<T, void, unknown>
): Promise<T[]> {
  const values: T[] = [];

  for await (const value of generator) {
    values.push(value);
  }

  return values;
}

describe('scanAnnouncementsForUserUsingSubgraph', () => {
  test('yields one scanned batch per page without speculative prefetch', async () => {
    const pageOne = [
      makeAnnouncement({
        blockNumber: 101,
        from: allowedFrom,
        isForUser: false,
        logIndex: 0,
        sequence: 1,
        transactionIndex: 0
      }),
      makeAnnouncement({
        blockNumber: 100,
        from: allowedFrom,
        isForUser: true,
        logIndex: 1,
        sequence: 2,
        transactionIndex: 1
      })
    ];
    const pageTwo = [
      makeAnnouncement({
        blockNumber: 99,
        from: secondAllowedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 3,
        transactionIndex: 0
      })
    ];
    const { calls, fetcher } = createPageFetcher([
      {
        announcements: pageOne,
        nextCursor: 'cursor-1',
        snapshotBlock: 500n
      },
      {
        announcements: pageTwo,
        nextCursor: undefined,
        snapshotBlock: 500n
      }
    ]);

    const iterator = scanAnnouncementsForUserUsingSubgraphWithPageFetcher(
      {
        spendingPublicKey: userKeys.spendingPublicKey,
        subgraphUrl: 'https://example.com/subgraph',
        viewingPrivateKey: userKeys.viewingPrivateKey
      },
      fetcher
    );

    expect(calls).toHaveLength(0);

    const firstBatch = await iterator.next();

    expect(calls).toHaveLength(1);
    expect(firstBatch.value).toEqual({
      announcements: [pageOne[1]],
      nextCursor: 'cursor-1',
      scannedCount: 2,
      snapshotBlock: 500n
    });

    await iterator.return(undefined);
    expect(calls).toHaveLength(1);
  });

  test('resumes from a provided cursor and snapshot block', async () => {
    const page = [
      makeAnnouncement({
        blockNumber: 90,
        from: allowedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 4,
        transactionIndex: 0
      })
    ];
    const { calls, fetcher } = createPageFetcher([
      {
        announcements: page,
        nextCursor: undefined,
        snapshotBlock: 700n
      }
    ]);

    const iterator = scanAnnouncementsForUserUsingSubgraphWithPageFetcher(
      {
        cursor: 'resume-cursor',
        snapshotBlock: 700n,
        spendingPublicKey: userKeys.spendingPublicKey,
        subgraphUrl: 'https://example.com/subgraph',
        viewingPrivateKey: userKeys.viewingPrivateKey
      },
      fetcher
    );

    const batch = await iterator.next();

    expect(calls[0]).toMatchObject({
      cursor: 'resume-cursor',
      snapshotBlock: 700n
    });
    expect(batch.value?.snapshotBlock).toBe(700n);
  });

  test('yields empty batches when a page has zero matching announcements', async () => {
    const { fetcher } = createPageFetcher([
      {
        announcements: [
          makeAnnouncement({
            blockNumber: 88,
            from: blockedFrom,
            isForUser: false,
            logIndex: 0,
            sequence: 5,
            transactionIndex: 0
          })
        ],
        nextCursor: undefined,
        snapshotBlock: 800n
      }
    ]);

    const batches = await collectAll(
      scanAnnouncementsForUserUsingSubgraphWithPageFetcher(
        {
          spendingPublicKey: userKeys.spendingPublicKey,
          subgraphUrl: 'https://example.com/subgraph',
          viewingPrivateKey: userKeys.viewingPrivateKey
        },
        fetcher
      )
    );

    expect(batches).toEqual([
      {
        announcements: [],
        nextCursor: undefined,
        scannedCount: 1,
        snapshotBlock: 800n
      }
    ]);
  });

  test('matches the eager user scan when pages already satisfy the bounded scan order', async () => {
    const pageOne = [
      makeAnnouncement({
        blockNumber: 120,
        from: allowedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 6,
        transactionIndex: 0
      }),
      makeAnnouncement({
        blockNumber: 118,
        from: secondAllowedFrom,
        isForUser: false,
        logIndex: 1,
        sequence: 7,
        transactionIndex: 0
      })
    ];
    const pageTwo = [
      makeAnnouncement({
        blockNumber: 117,
        from: secondAllowedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 8,
        transactionIndex: 0
      }),
      makeAnnouncement({
        blockNumber: 116,
        from: blockedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 9,
        transactionIndex: 0
      })
    ];
    const flattenedCandidates = [...pageOne, ...pageTwo];
    const { fetcher } = createPageFetcher([
      {
        announcements: pageOne,
        nextCursor: 'cursor-2',
        snapshotBlock: 900n
      },
      {
        announcements: pageTwo,
        nextCursor: undefined,
        snapshotBlock: 900n
      }
    ]);

    const streamingBatches = await collectAll(
      scanAnnouncementsForUserUsingSubgraphWithPageFetcher(
        {
          spendingPublicKey: userKeys.spendingPublicKey,
          subgraphUrl: 'https://example.com/subgraph',
          viewingPrivateKey: userKeys.viewingPrivateKey
        },
        fetcher
      )
    );
    const eagerAnnouncements = await getAnnouncementsForUser({
      announcements: flattenedCandidates,
      spendingPublicKey: userKeys.spendingPublicKey,
      viewingPrivateKey: userKeys.viewingPrivateKey
    });

    expect(streamingBatches.flatMap(batch => batch.announcements)).toEqual(
      eagerAnnouncements
    );
  });

  test('applies include and exclude lists using the shared filtering internals', async () => {
    const matchingAnnouncements = [
      makeAnnouncement({
        blockNumber: 110,
        from: allowedFrom,
        isForUser: true,
        logIndex: 1,
        sequence: 10,
        transactionIndex: 0
      }),
      makeAnnouncement({
        blockNumber: 109,
        from: blockedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 11,
        transactionIndex: 0
      })
    ];
    const publicClient = createPublicClientForAnnouncements(
      matchingAnnouncements
    );
    const { fetcher } = createPageFetcher([
      {
        announcements: matchingAnnouncements,
        nextCursor: undefined,
        snapshotBlock: 901n
      }
    ]);

    const batches = await collectAll(
      scanAnnouncementsForUserUsingSubgraphWithPageFetcher(
        {
          clientParams: {
            publicClient: publicClient as never
          },
          excludeList: [blockedFrom],
          includeList: [allowedFrom],
          spendingPublicKey: userKeys.spendingPublicKey,
          subgraphUrl: 'https://example.com/subgraph',
          viewingPrivateKey: userKeys.viewingPrivateKey
        },
        fetcher
      )
    );

    expect(batches).toEqual([
      {
        announcements: [matchingAnnouncements[0]],
        nextCursor: undefined,
        scannedCount: 2,
        snapshotBlock: 901n
      }
    ]);
  });

  test('rejects invalid initial and resume parameter combinations', async () => {
    const iterator = scanAnnouncementsForUserUsingSubgraphWithPageFetcher({
      cursor: 'cursor-only',
      spendingPublicKey: userKeys.spendingPublicKey,
      subgraphUrl: 'https://example.com/subgraph',
      viewingPrivateKey: userKeys.viewingPrivateKey
    } as never);

    expect(iterator.next()).rejects.toThrow(
      'cursor and snapshotBlock must either both be omitted for the initial page or both be provided for subsequent pages'
    );
  });

  test('continues scanning when later pages are newer than earlier pages in subgraph id order', async () => {
    const firstPage = [
      makeAnnouncement({
        blockNumber: 100,
        from: allowedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 12,
        transactionIndex: 0
      })
    ];
    const secondPage = [
      makeAnnouncement({
        blockNumber: 101,
        from: secondAllowedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 13,
        transactionIndex: 0
      })
    ];
    const { fetcher } = createPageFetcher([
      {
        announcements: firstPage,
        nextCursor: 'cursor-3',
        snapshotBlock: 902n
      },
      {
        announcements: secondPage,
        nextCursor: undefined,
        snapshotBlock: 902n
      }
    ]);
    const iterator = scanAnnouncementsForUserUsingSubgraphWithPageFetcher(
      {
        spendingPublicKey: userKeys.spendingPublicKey,
        subgraphUrl: 'https://example.com/subgraph',
        viewingPrivateKey: userKeys.viewingPrivateKey
      },
      fetcher
    );

    await expect(iterator.next()).resolves.toMatchObject({
      done: false,
      value: {
        announcements: firstPage,
        nextCursor: 'cursor-3',
        scannedCount: 1,
        snapshotBlock: 902n
      }
    });
    await expect(iterator.next()).resolves.toMatchObject({
      done: false,
      value: {
        announcements: secondPage,
        nextCursor: undefined,
        scannedCount: 1,
        snapshotBlock: 902n
      }
    });
  });

  test('sorts announcements by block number, transaction index, then log index', () => {
    const announcements = [
      makeAnnouncement({
        blockNumber: 100,
        from: allowedFrom,
        isForUser: true,
        logIndex: 1,
        sequence: 14,
        transactionIndex: 0
      }),
      makeAnnouncement({
        blockNumber: 101,
        from: allowedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 15,
        transactionIndex: 0
      }),
      makeAnnouncement({
        blockNumber: 100,
        from: allowedFrom,
        isForUser: true,
        logIndex: 0,
        sequence: 16,
        transactionIndex: 1
      })
    ];

    const sorted = sortAnnouncementsByChainRecency(announcements);

    expect(sorted).toEqual([
      announcements[1],
      announcements[2],
      announcements[0]
    ]);
    expect(compareAnnouncementsByChainRecency(sorted[0], sorted[1])).toBe(-1);
    expect(compareAnnouncementsByChainRecency(sorted[1], sorted[2])).toBe(-1);
  });

  test('exposes the wrapped scan error with the original error attached', () => {
    const originalError = new Error('boom');
    const error = new ScanAnnouncementsForUserUsingSubgraphError(
      'Failed to scan announcements from the subgraph',
      originalError
    );

    expect(error.name).toBe('ScanAnnouncementsForUserUsingSubgraphError');
    expect(error.message).toBe(
      'Failed to scan announcements from the subgraph'
    );
    expect(error.originalError).toBe(originalError);
  });
});
