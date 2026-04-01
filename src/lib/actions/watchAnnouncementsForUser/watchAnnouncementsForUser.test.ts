import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Address } from 'viem';
import {
  type AnnouncementLog,
  ERC5564AnnouncerAbi,
  ERC5564_CONTRACT_ADDRESS,
  VALID_SCHEME_ID,
  generateStealthAddress
} from '../../..';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../helpers/types';
import type { StealthActions } from '../../stealthClient/types';
import {
  createWatchedAnnouncementsQueue,
  processWatchedAnnouncementsBatch
} from './watchAnnouncementsForUser';

const NUM_ANNOUNCEMENTS = 3;
const WATCH_POLLING_INTERVAL = 250;
const WAIT_TIMEOUT_MS = 8_000;

type WriteAnnounceArgs = {
  schemeId: bigint;
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
};

const sleep = async (ms: number) =>
  await new Promise(resolve => setTimeout(resolve, ms));

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(innerResolve => {
    resolve = innerResolve;
  });

  return {
    promise,
    resolve
  };
};

const waitForCondition = async (
  condition: () => boolean,
  timeoutMs = WAIT_TIMEOUT_MS
) => {
  const startedAt = Date.now();

  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for watcher state');
    }

    await sleep(50);
  }
};

const incrementLastCharOfHexString = (hexStr: `0x${string}`) => {
  const lastChar = hexStr.slice(-1);
  const base = '0123456789abcdef';
  const index = base.indexOf(lastChar.toLowerCase());
  const newLastChar = index === 15 ? '0' : base[index + 1];
  return `0x${hexStr.slice(2, -1) + newLastChar}` as `0x${string}`;
};

const announce = async ({
  walletClient,
  ERC5564Address,
  args
}: {
  walletClient: SuperWalletClient;
  ERC5564Address: Address;
  args: WriteAnnounceArgs;
}) => {
  if (!walletClient.account) throw new Error('No account found');

  const hash = await walletClient.writeContract({
    address: ERC5564Address,
    functionName: 'announce',
    args: [
      args.schemeId,
      args.stealthAddress,
      args.ephemeralPublicKey,
      args.viewTag
    ],
    abi: ERC5564AnnouncerAbi,
    chain: walletClient.chain,
    account: walletClient.account
  });

  const receipt = await walletClient.waitForTransactionReceipt({
    hash
  });

  return {
    blockNumber: receipt.blockNumber,
    hash
  };
};

describe('watchAnnouncementsForUser', () => {
  let stealthClient: StealthActions;
  let walletClient: SuperWalletClient;
  let ERC5564Address: Address;

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const schemeIdBigInt = BigInt(schemeId);
  const { spendingPublicKey, viewingPrivateKey, stealthMetaAddressURI } =
    setupTestStealthKeys(schemeId);

  beforeAll(async () => {
    ({ stealthClient, ERC5564Address } = await setupTestEnv());
    walletClient = await setupTestWallet();
  });

  afterAll(() => {
    // No shared watcher cleanup.
  });

  test('awaits async handlers and still delivers relevant announcements', async () => {
    const watchedAnnouncements: AnnouncementLog[] = [];
    const fromBlock = (await walletClient.getBlockNumber()) + 1n;
    const unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address
      },
      fromBlock,
      handleLogsForUser: async logs => {
        await sleep(25);

        for (const log of logs) {
          watchedAnnouncements.push(log);
        }
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL
      }
    });

    try {
      const { stealthAddress, ephemeralPublicKey, viewTag } =
        generateStealthAddress({
          stealthMetaAddressURI,
          schemeId
        });

      for (let index = 0; index < NUM_ANNOUNCEMENTS; index += 1) {
        await announce({
          walletClient,
          ERC5564Address,
          args: {
            schemeId: schemeIdBigInt,
            stealthAddress,
            ephemeralPublicKey,
            viewTag
          }
        });
      }

      await waitForCondition(
        () => watchedAnnouncements.length === NUM_ANNOUNCEMENTS
      );

      expect(watchedAnnouncements).toHaveLength(NUM_ANNOUNCEMENTS);
    } finally {
      unwatch();
    }
  });

  test('reports rejected handlers once and keeps watching later announcements', async () => {
    const handledAnnouncements: AnnouncementLog[] = [];
    const handlerErrors: string[] = [];
    const fromBlock = (await walletClient.getBlockNumber()) + 1n;
    let handlerCalls = 0;

    const unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address
      },
      fromBlock,
      handleLogsForUser: async logs => {
        if (logs.length === 0) {
          return;
        }

        handlerCalls += 1;

        if (handlerCalls === 1) {
          throw new Error('intentional handler failure');
        }

        handledAnnouncements.push(...logs);
      },
      onError: async error => {
        await sleep(25);
        handlerErrors.push(error.message);
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL
      }
    });

    try {
      const firstAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: firstAnnouncement.stealthAddress,
          ephemeralPublicKey: firstAnnouncement.ephemeralPublicKey,
          viewTag: firstAnnouncement.viewTag
        }
      });

      await waitForCondition(() => handlerErrors.length === 1);

      const secondAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      const secondReceipt = await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: secondAnnouncement.stealthAddress,
          ephemeralPublicKey: secondAnnouncement.ephemeralPublicKey,
          viewTag: secondAnnouncement.viewTag
        }
      });

      await waitForCondition(() => handledAnnouncements.length === 1);

      expect(handlerErrors).toEqual(['intentional handler failure']);
      expect(handlerCalls).toEqual(2);
      expect(handledAnnouncements[0]?.transactionHash).toEqual(
        secondReceipt.hash
      );
    } finally {
      unwatch();
    }
  });

  test('logs handler failures when onError is omitted and keeps watching later announcements', async () => {
    const originalConsoleError = console.error;
    const loggedErrors: Error[] = [];
    const handledAnnouncements: AnnouncementLog[] = [];
    let handlerCalls = 0;
    const fromBlock = (await walletClient.getBlockNumber()) + 1n;

    console.error = ((value: unknown) => {
      if (value instanceof Error) {
        loggedErrors.push(value);
      }
    }) as typeof console.error;

    const unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address
      },
      fromBlock,
      handleLogsForUser: async logs => {
        if (logs.length === 0) {
          return;
        }

        handlerCalls += 1;

        if (handlerCalls === 1) {
          throw new Error('handler failed without onError');
        }

        handledAnnouncements.push(...logs);
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL
      }
    });

    try {
      const firstAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: firstAnnouncement.stealthAddress,
          ephemeralPublicKey: firstAnnouncement.ephemeralPublicKey,
          viewTag: firstAnnouncement.viewTag
        }
      });

      await waitForCondition(() => loggedErrors.length === 1);

      const secondAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      const secondReceipt = await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: secondAnnouncement.stealthAddress,
          ephemeralPublicKey: secondAnnouncement.ephemeralPublicKey,
          viewTag: secondAnnouncement.viewTag
        }
      });

      await waitForCondition(() => handledAnnouncements.length === 1);

      expect(loggedErrors[0]?.message).toEqual(
        'handler failed without onError'
      );
      expect(handledAnnouncements[0]?.transactionHash).toEqual(
        secondReceipt.hash
      );
    } finally {
      console.error = originalConsoleError;
      unwatch();
    }
  });

  test('swallows onError failures and keeps watching later announcements', async () => {
    const originalConsoleError = console.error;
    const loggedErrors: Error[] = [];
    const handledAnnouncements: AnnouncementLog[] = [];
    const fromBlock = (await walletClient.getBlockNumber()) + 1n;
    let handlerCalls = 0;

    console.error = ((value: unknown) => {
      if (value instanceof Error) {
        loggedErrors.push(value);
      }
    }) as typeof console.error;

    const unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address
      },
      fromBlock,
      handleLogsForUser: async logs => {
        if (logs.length === 0) {
          return;
        }

        handlerCalls += 1;

        if (handlerCalls === 1) {
          throw new Error('primary handler failure');
        }

        handledAnnouncements.push(...logs);
      },
      onError: () => {
        throw new Error('secondary onError failure');
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL
      }
    });

    try {
      const firstAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: firstAnnouncement.stealthAddress,
          ephemeralPublicKey: firstAnnouncement.ephemeralPublicKey,
          viewTag: firstAnnouncement.viewTag
        }
      });

      await waitForCondition(() => loggedErrors.length === 2);

      const secondAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      const secondReceipt = await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: secondAnnouncement.stealthAddress,
          ephemeralPublicKey: secondAnnouncement.ephemeralPublicKey,
          viewTag: secondAnnouncement.viewTag
        }
      });

      await waitForCondition(() => handledAnnouncements.length === 1);

      expect(loggedErrors.map(error => error.message)).toEqual([
        'primary handler failure',
        'secondary onError failure'
      ]);
      expect(handledAnnouncements[0]?.transactionHash).toEqual(
        secondReceipt.hash
      );
    } finally {
      console.error = originalConsoleError;
      unwatch();
    }
  });

  test('recovers when fallback console logging throws', async () => {
    const originalConsoleError = console.error;
    const handledAnnouncements: AnnouncementLog[] = [];
    const fromBlock = (await walletClient.getBlockNumber()) + 1n;
    let consoleErrorCalls = 0;
    let handlerCalls = 0;

    console.error = (() => {
      consoleErrorCalls += 1;
      throw new Error('console.error failed');
    }) as typeof console.error;

    const unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address
      },
      fromBlock,
      handleLogsForUser: async logs => {
        if (logs.length === 0) {
          return;
        }

        handlerCalls += 1;

        if (handlerCalls === 1) {
          throw new Error('handler failed before console fallback');
        }

        handledAnnouncements.push(...logs);
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL
      }
    });

    try {
      const firstAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: firstAnnouncement.stealthAddress,
          ephemeralPublicKey: firstAnnouncement.ephemeralPublicKey,
          viewTag: firstAnnouncement.viewTag
        }
      });

      await waitForCondition(() => consoleErrorCalls === 1);

      const secondAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      const secondReceipt = await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: secondAnnouncement.stealthAddress,
          ephemeralPublicKey: secondAnnouncement.ephemeralPublicKey,
          viewTag: secondAnnouncement.viewTag
        }
      });

      await waitForCondition(() => handledAnnouncements.length === 1);

      expect(consoleErrorCalls).toEqual(1);
      expect(handledAnnouncements[0]?.transactionHash).toEqual(
        secondReceipt.hash
      );
    } finally {
      console.error = originalConsoleError;
      unwatch();
    }
  });

  test('starts watching from the provided fromBlock boundary', async () => {
    const olderAnnouncement = generateStealthAddress({
      stealthMetaAddressURI,
      schemeId
    });

    const olderReceipt = await announce({
      walletClient,
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        stealthAddress: olderAnnouncement.stealthAddress,
        ephemeralPublicKey: olderAnnouncement.ephemeralPublicKey,
        viewTag: olderAnnouncement.viewTag
      }
    });

    const watchedAnnouncements: AnnouncementLog[] = [];
    const unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address
      },
      fromBlock: olderReceipt.blockNumber + 1n,
      handleLogsForUser: logs => {
        watchedAnnouncements.push(...logs);
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL
      }
    });

    try {
      const newerAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      const newerReceipt = await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: newerAnnouncement.stealthAddress,
          ephemeralPublicKey: newerAnnouncement.ephemeralPublicKey,
          viewTag: newerAnnouncement.viewTag
        }
      });

      await waitForCondition(() => watchedAnnouncements.length === 1);

      expect(watchedAnnouncements[0]?.transactionHash).toEqual(
        newerReceipt.hash
      );
      expect(watchedAnnouncements[0]?.transactionHash).not.toEqual(
        olderReceipt.hash
      );
    } finally {
      unwatch();
    }
  });

  test('serializes async handler batches without overlap', async () => {
    const firstHandlerGate = createDeferred();
    const handlerOrder: string[] = [];
    let activeHandlers = 0;
    let handlerCalls = 0;
    let overlapDetected = false;
    const fromBlock = (await walletClient.getBlockNumber()) + 1n;

    const unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address
      },
      fromBlock,
      handleLogsForUser: async logs => {
        if (logs.length === 0) {
          return;
        }

        handlerCalls += 1;
        activeHandlers += 1;
        handlerOrder.push(`start-${handlerCalls}`);

        if (activeHandlers > 1) {
          overlapDetected = true;
        }

        if (handlerCalls === 1) {
          await firstHandlerGate.promise;
        }

        handlerOrder.push(`end-${handlerCalls}`);
        activeHandlers -= 1;
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL
      }
    });

    try {
      const firstAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: firstAnnouncement.stealthAddress,
          ephemeralPublicKey: firstAnnouncement.ephemeralPublicKey,
          viewTag: firstAnnouncement.viewTag
        }
      });

      await waitForCondition(() => handlerOrder.includes('start-1'));

      const secondAnnouncement = generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });

      await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress: secondAnnouncement.stealthAddress,
          ephemeralPublicKey: secondAnnouncement.ephemeralPublicKey,
          viewTag: secondAnnouncement.viewTag
        }
      });

      await sleep(WATCH_POLLING_INTERVAL * 2);

      expect(handlerCalls).toEqual(1);
      expect(overlapDetected).toBeFalse();

      firstHandlerGate.resolve();

      await waitForCondition(() => handlerCalls === 2);
      await waitForCondition(() => activeHandlers === 0);

      expect(handlerOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
      expect(overlapDetected).toBeFalse();
    } finally {
      firstHandlerGate.resolve();
      unwatch();
    }
  });

  test(
    'lets the in-flight batch finish after unwatch and stops later batches',
    async () => {
      const firstHandlerGate = createDeferred();
      const handledAnnouncements: AnnouncementLog[] = [];
      const fromBlock = (await walletClient.getBlockNumber()) + 1n;

      const unwatch = await stealthClient.watchAnnouncementsForUser({
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          caller: walletClient.account?.address
        },
        fromBlock,
        handleLogsForUser: async logs => {
          if (logs.length === 0) {
            return;
          }

          if (handledAnnouncements.length === 0) {
            await firstHandlerGate.promise;
          }

          handledAnnouncements.push(...logs);
        },
        spendingPublicKey,
        viewingPrivateKey,
        pollOptions: {
          pollingInterval: WATCH_POLLING_INTERVAL
        }
      });

      try {
        const firstAnnouncement = generateStealthAddress({
          stealthMetaAddressURI,
          schemeId
        });

        await announce({
          walletClient,
          ERC5564Address,
          args: {
            schemeId: schemeIdBigInt,
            stealthAddress: firstAnnouncement.stealthAddress,
            ephemeralPublicKey: firstAnnouncement.ephemeralPublicKey,
            viewTag: firstAnnouncement.viewTag
          }
        });

        await sleep(WATCH_POLLING_INTERVAL * 2);
        unwatch();
        firstHandlerGate.resolve();

        await waitForCondition(() => handledAnnouncements.length === 1);

        const secondAnnouncement = generateStealthAddress({
          stealthMetaAddressURI,
          schemeId
        });

        await announce({
          walletClient,
          ERC5564Address,
          args: {
            schemeId: schemeIdBigInt,
            stealthAddress: secondAnnouncement.stealthAddress,
            ephemeralPublicKey: secondAnnouncement.ephemeralPublicKey,
            viewTag: secondAnnouncement.viewTag
          }
        });

        await sleep(WATCH_POLLING_INTERVAL * 3);

        expect(handledAnnouncements).toHaveLength(1);
      } finally {
        firstHandlerGate.resolve();
        unwatch();
      }
    },
    10_000
  );

  test('does not emit announcements that do not apply to the user', async () => {
    const watchedAnnouncements: AnnouncementLog[] = [];
    const fromBlock = (await walletClient.getBlockNumber()) + 1n;
    const unwatch = await stealthClient.watchAnnouncementsForUser({
      ERC5564Address,
      args: {
        schemeId: schemeIdBigInt,
        caller: walletClient.account?.address
      },
      fromBlock,
      handleLogsForUser: logs => {
        watchedAnnouncements.push(...logs);
      },
      spendingPublicKey,
      viewingPrivateKey,
      pollOptions: {
        pollingInterval: WATCH_POLLING_INTERVAL
      }
    });

    try {
      const { stealthAddress, ephemeralPublicKey, viewTag } =
        generateStealthAddress({
          stealthMetaAddressURI,
          schemeId
        });

      await announce({
        walletClient,
        ERC5564Address,
        args: {
          schemeId: schemeIdBigInt,
          stealthAddress,
          ephemeralPublicKey: incrementLastCharOfHexString(ephemeralPublicKey),
          viewTag
        }
      });

      await sleep(WATCH_POLLING_INTERVAL * 3);

      expect(watchedAnnouncements).toHaveLength(0);
    } finally {
      unwatch();
    }
  });
});

describe('createWatchedAnnouncementsQueue', () => {
  test('recovers after an unexpected queued rejection and keeps draining later tasks', async () => {
    const recoveredErrors: string[] = [];
    const taskOrder: string[] = [];
    const queue = createWatchedAnnouncementsQueue({
      onUnexpectedError: async error => {
        recoveredErrors.push(
          error instanceof Error ? error.message : 'unexpected queue failure'
        );
      }
    });

    queue.enqueue(async () => {
      taskOrder.push('first-start');
      throw new Error('unexpected queued failure');
    });

    queue.enqueue(async () => {
      taskOrder.push('second-start');
    });

    await queue.onIdle();

    expect(recoveredErrors).toEqual(['unexpected queued failure']);
    expect(taskOrder).toEqual(['first-start', 'second-start']);
  });

  test('continues draining later tasks when onUnexpectedError throws', async () => {
    const taskOrder: string[] = [];
    const queue = createWatchedAnnouncementsQueue({
      onUnexpectedError: () => {
        throw new Error('unexpected error handler failure');
      }
    });

    queue.enqueue(async () => {
      taskOrder.push('first-start');
      throw new Error('unexpected queued failure');
    });

    queue.enqueue(async () => {
      taskOrder.push('second-start');
    });

    await queue.onIdle();

    expect(taskOrder).toEqual(['first-start', 'second-start']);
  });

  test('continues after an internal filtering failure from one queued batch', async () => {
    const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
    const schemeIdBigInt = BigInt(schemeId);
    const caller = '0x00000000000000000000000000000000000000AA' as Address;
    const { spendingPublicKey, viewingPrivateKey, stealthMetaAddressURI } =
      setupTestStealthKeys(schemeId);
    const { stealthAddress, ephemeralPublicKey, viewTag } =
      generateStealthAddress({
        stealthMetaAddressURI,
        schemeId
      });
    const reportedErrors: string[] = [];
    const handledAnnouncements: AnnouncementLog[] = [];
    let filterCalls = 0;

    const queue = createWatchedAnnouncementsQueue({
      onUnexpectedError: error => {
        throw error;
      }
    });

    const createRawLog = (
      transactionHash: `0x${string}`
    ): Parameters<
      typeof processWatchedAnnouncementsBatch
    >[0]['logs'][number] => ({
      address: ERC5564_CONTRACT_ADDRESS as `0x${string}`,
      blockHash: `0x${'1'.repeat(64)}` as `0x${string}`,
      blockNumber: 1n,
      data: '0x' as `0x${string}`,
      logIndex: 0,
      removed: false,
      topics: [`0x${'4'.repeat(64)}` as `0x${string}`],
      transactionHash,
      transactionIndex: 0,
      args: {
        caller,
        ephemeralPubKey: ephemeralPublicKey,
        metadata: viewTag,
        schemeId: schemeIdBigInt,
        stealthAddress
      }
    });

    const filterAnnouncementsForUser = async ({
      announcements
    }: {
      announcements: AnnouncementLog[];
    }) => {
      filterCalls += 1;

      if (filterCalls === 1) {
        throw new Error('synthetic filtering failure');
      }

      return announcements;
    };

    queue.enqueue(async () => {
      await processWatchedAnnouncementsBatch({
        logs: [createRawLog(`0x${'2'.repeat(64)}`)],
        spendingPublicKey,
        viewingPrivateKey,
        publicClient: {} as never,
        handleLogsForUser: logs => {
          handledAnnouncements.push(...logs);
        },
        onError: error => {
          reportedErrors.push(error.message);
        },
        filterAnnouncementsForUser
      });
    });

    queue.enqueue(async () => {
      await processWatchedAnnouncementsBatch({
        logs: [createRawLog(`0x${'3'.repeat(64)}`)],
        spendingPublicKey,
        viewingPrivateKey,
        publicClient: {} as never,
        handleLogsForUser: logs => {
          handledAnnouncements.push(...logs);
        },
        onError: error => {
          reportedErrors.push(error.message);
        },
        filterAnnouncementsForUser
      });
    });

    await queue.onIdle();

    expect(reportedErrors).toEqual(['synthetic filtering failure']);
    expect(handledAnnouncements).toHaveLength(1);
    expect(handledAnnouncements[0]?.transactionHash).toEqual(
      `0x${'3'.repeat(64)}`
    );
  });
});
