import type {
  AnnouncementLog,
  GetAnnouncementsForUserParams,
  WatchAnnouncementsForUserBatchMeta,
  WatchAnnouncementsForUserParams,
  WatchAnnouncementsForUserPollMeta,
  WatchAnnouncementsForUserReturnType
} from '..';
import { ERC5564AnnouncerAbi, getAnnouncementsForUser } from '../..';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';

function normalizeWatchError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage, {
    cause: error
  });
}

async function reportWatchError({
  error,
  fallbackMessage,
  onError
}: {
  error: unknown;
  fallbackMessage: string;
  onError?: WatchAnnouncementsForUserParams['onError'];
}): Promise<void> {
  const normalizedError = normalizeWatchError(error, fallbackMessage);
  const safeConsoleError = (loggedError: Error) => {
    try {
      console.error(loggedError);
    } catch {
      // Swallow logger failures so batch processing can continue.
    }
  };

  if (!onError) {
    safeConsoleError(normalizedError);
    return;
  }

  try {
    await onError(normalizedError);
  } catch (onErrorFailure) {
    // Swallow secondary reporting failures so the live watch can continue.
    safeConsoleError(normalizedError);
    safeConsoleError(
      normalizeWatchError(
        onErrorFailure,
        'watchAnnouncementsForUser onError handler failed'
      )
    );
  }
}

const DEFAULT_WATCH_HEARTBEAT_INTERVAL_MS = 4_000;
const DEFAULT_WATCH_POLLING_INTERVAL_MS = 4_000;

type WatchedAnnouncementsQueue = {
  enqueue: (task: () => Promise<void>) => void;
  onIdle: () => Promise<void>;
};

export function createWatchedAnnouncementsQueue({
  onUnexpectedError
}: {
  onUnexpectedError: (error: unknown) => void | Promise<void>;
}): WatchedAnnouncementsQueue {
  let processingQueue = Promise.resolve();

  return {
    enqueue(task) {
      processingQueue = processingQueue.then(task).catch(async error => {
        try {
          await onUnexpectedError(error);
        } catch {
          // Swallow queue-recovery failures so later batches can still run.
        }
      });
    },
    async onIdle() {
      await processingQueue;
    }
  };
}

type WatchedAnnouncementEventLog = Omit<
  AnnouncementLog,
  'caller' | 'ephemeralPubKey' | 'metadata' | 'schemeId' | 'stealthAddress'
> & {
  args: Pick<
    AnnouncementLog,
    'caller' | 'ephemeralPubKey' | 'metadata' | 'schemeId' | 'stealthAddress'
  >;
};

const getInitialPreviousBlockNumber = async ({
  fromBlock,
  publicClient
}: {
  fromBlock?: WatchAnnouncementsForUserParams['fromBlock'];
  publicClient: ReturnType<typeof handleViemPublicClient>;
}): Promise<bigint> => {
  if (typeof fromBlock === 'bigint') {
    return fromBlock - 1n;
  }

  return publicClient.getBlockNumber({ cacheTime: 0 });
};

const getObservedBlockFromLogs = (
  logs: WatchedAnnouncementEventLog[]
): bigint | undefined =>
  logs.reduce<bigint | undefined>((maxObservedBlock, log) => {
    if (log.blockNumber == null) {
      return maxObservedBlock;
    }

    const { blockNumber } = log;

    return maxObservedBlock === undefined || blockNumber > maxObservedBlock
      ? blockNumber
      : maxObservedBlock;
  }, undefined);

export async function processWatchedAnnouncementsBatch<T = void>({
  logs,
  spendingPublicKey,
  viewingPrivateKey,
  publicClient,
  excludeList,
  includeList,
  fromBlock,
  handleLogsForUser,
  onError,
  filterAnnouncementsForUser = getAnnouncementsForUser
}: {
  logs: WatchedAnnouncementEventLog[];
  spendingPublicKey: WatchAnnouncementsForUserParams<T>['spendingPublicKey'];
  viewingPrivateKey: WatchAnnouncementsForUserParams<T>['viewingPrivateKey'];
  publicClient: ReturnType<typeof handleViemPublicClient>;
  excludeList?: WatchAnnouncementsForUserParams<T>['excludeList'];
  includeList?: WatchAnnouncementsForUserParams<T>['includeList'];
  fromBlock?: WatchAnnouncementsForUserParams<T>['fromBlock'];
  handleLogsForUser: WatchAnnouncementsForUserParams<T>['handleLogsForUser'];
  onError?: WatchAnnouncementsForUserParams<T>['onError'];
  filterAnnouncementsForUser?: (
    params: GetAnnouncementsForUserParams
  ) => Promise<AnnouncementLog[]>;
}): Promise<void> {
  const announcements: AnnouncementLog[] = logs.map(log => ({
    ...log,
    caller: log.args.caller,
    ephemeralPubKey: log.args.ephemeralPubKey,
    metadata: log.args.metadata,
    schemeId: log.args.schemeId,
    stealthAddress: log.args.stealthAddress
  }));

  let relevantAnnouncements: AnnouncementLog[];
  try {
    relevantAnnouncements = await filterAnnouncementsForUser({
      announcements,
      spendingPublicKey,
      viewingPrivateKey,
      clientParams: { publicClient },
      excludeList,
      includeList
    });
  } catch (error) {
    await reportWatchError({
      error,
      fallbackMessage:
        'watchAnnouncementsForUser failed while filtering watched announcements',
      onError
    });
    return;
  }

  const observedBlock =
    getObservedBlockFromLogs(logs) ?? (await publicClient.getBlockNumber());
  const batchMeta: WatchAnnouncementsForUserBatchMeta = {
    fromBlock,
    observedBlock,
    pollTimestamp: Date.now(),
    rawLogCount: logs.length,
    relevantLogCount: relevantAnnouncements.length
  };

  try {
    await handleLogsForUser(relevantAnnouncements, batchMeta);
  } catch (error) {
    await reportWatchError({
      error,
      fallbackMessage:
        'watchAnnouncementsForUser handler failed while processing a batch',
      onError
    });
  }
}

export function startWatchHeartbeat<T = void>({
  fromBlock,
  onError,
  onHeartbeat,
  pollingInterval,
  publicClient
}: {
  fromBlock?: WatchAnnouncementsForUserParams<T>['fromBlock'];
  onError?: WatchAnnouncementsForUserParams<T>['onError'];
  onHeartbeat?: WatchAnnouncementsForUserParams<T>['onHeartbeat'];
  pollingInterval?: number;
  publicClient: ReturnType<typeof handleViemPublicClient>;
}) {
  if (!onHeartbeat) {
    return () => {};
  }

  let active = true;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const heartbeatInterval =
    pollingInterval ?? DEFAULT_WATCH_HEARTBEAT_INTERVAL_MS;

  const emitHeartbeat = async () => {
    try {
      const heartbeatMeta: WatchAnnouncementsForUserPollMeta = {
        fromBlock,
        observedBlock: await publicClient.getBlockNumber(),
        pollTimestamp: Date.now()
      };

      await onHeartbeat(heartbeatMeta);
    } catch (error) {
      await reportWatchError({
        error,
        fallbackMessage:
          'watchAnnouncementsForUser heartbeat failed while observing the chain head',
        onError
      });
    } finally {
      if (active) {
        timeoutId = setTimeout(() => {
          void emitHeartbeat();
        }, heartbeatInterval);
      }
    }
  };

  void emitHeartbeat();

  return () => {
    active = false;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  };
}

export async function startPollingAnnouncementEvents<T = void>({
  args,
  ERC5564Address,
  excludeList,
  fromBlock,
  handleLogsForUser,
  includeList,
  onError,
  pollOptions,
  publicClient,
  spendingPublicKey,
  viewingPrivateKey,
  watchedAnnouncementsQueue
}: {
  args: WatchAnnouncementsForUserParams<T>['args'];
  ERC5564Address: WatchAnnouncementsForUserParams<T>['ERC5564Address'];
  excludeList?: WatchAnnouncementsForUserParams<T>['excludeList'];
  fromBlock?: WatchAnnouncementsForUserParams<T>['fromBlock'];
  handleLogsForUser: WatchAnnouncementsForUserParams<T>['handleLogsForUser'];
  includeList?: WatchAnnouncementsForUserParams<T>['includeList'];
  onError?: WatchAnnouncementsForUserParams<T>['onError'];
  pollOptions?: WatchAnnouncementsForUserParams<T>['pollOptions'];
  publicClient: ReturnType<typeof handleViemPublicClient>;
  spendingPublicKey: WatchAnnouncementsForUserParams<T>['spendingPublicKey'];
  viewingPrivateKey: WatchAnnouncementsForUserParams<T>['viewingPrivateKey'];
  watchedAnnouncementsQueue: WatchedAnnouncementsQueue;
}): Promise<WatchAnnouncementsForUserReturnType> {
  let active = true;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let previousBlockNumber = await getInitialPreviousBlockNumber({
    fromBlock,
    publicClient
  });
  const pollingInterval =
    pollOptions?.pollingInterval ??
    publicClient.pollingInterval ??
    DEFAULT_WATCH_POLLING_INTERVAL_MS;
  const enqueueLogs = (logs: WatchedAnnouncementEventLog[]) => {
    if (logs.length === 0) {
      return;
    }

    const batches =
      pollOptions?.batch === false ? logs.map(log => [log]) : [logs];

    for (const batch of batches) {
      watchedAnnouncementsQueue.enqueue(async () => {
        await processWatchedAnnouncementsBatch({
          logs: batch,
          spendingPublicKey,
          viewingPrivateKey,
          publicClient,
          excludeList,
          includeList,
          fromBlock,
          handleLogsForUser,
          onError
        });
      });
    }
  };

  const pollAnnouncements = async () => {
    try {
      const blockNumber = await publicClient.getBlockNumber({ cacheTime: 0 });
      if (!active) {
        return;
      }

      const nextFromBlock = previousBlockNumber + 1n;

      if (nextFromBlock > blockNumber) {
        return;
      }

      const logs = (await publicClient.getContractEvents({
        address: ERC5564Address,
        abi: ERC5564AnnouncerAbi,
        eventName: 'Announcement',
        args,
        fromBlock: nextFromBlock,
        toBlock: blockNumber,
        strict: true
      })) as WatchedAnnouncementEventLog[];

      if (!active) {
        return;
      }

      previousBlockNumber = blockNumber;
      enqueueLogs(logs);
    } catch (error) {
      await reportWatchError({
        error,
        fallbackMessage:
          'watchAnnouncementsForUser failed while polling announcement events',
        onError
      });
    }
  };

  const scheduleNextPoll = () => {
    timeoutId = setTimeout(() => {
      void runPollLoop();
    }, pollingInterval);
  };

  const runPollLoop = async () => {
    if (!active) {
      return;
    }

    await pollAnnouncements();

    if (active) {
      scheduleNextPoll();
    }
  };

  void runPollLoop();

  return () => {
    active = false;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Watches for announcement events relevant to the user.
 *
 * @property {EthAddress} ERC5564Address - The Ethereum address of the ERC5564 contract.
 * @property {AnnouncementArgs} args - Arguments to filter the announcements.
 * @property {bigint | 'latest'} [fromBlock] - Optional lower inclusive block bound for the live watch.
 * @property {(logs: AnnouncementLog[], meta: WatchAnnouncementsForUserBatchMeta) => unknown} handleLogsForUser - Callback function to handle the filtered announcement logs.
 *   The SDK ignores the return value, but awaits any returned promise before moving to the next batch.
 * @property {(meta: WatchAnnouncementsForUserPollMeta) => void | Promise<void>} [onHeartbeat] - Optional callback invoked whenever the watcher observes a chain head while polling.
 * @property {(error: Error) => void | Promise<void>} [onError] - Optional callback invoked when watched batch filtering or the consumer handler fails.
 * @property {WatchAnnouncementsForUserPollingOptions} [pollOptions] - Optional polling options to configure the behavior of watching announcements.
 *   This includes configurations such as polling frequency.
 * @property {Omit<GetAnnouncementsForUserParams, 'announcements'>} - Inherits all properties from GetAnnouncementsForUserParams except 'announcements'.
 *   This typically includes cryptographic keys and filter lists for inclusion or exclusion of specific announcements.
 */
async function watchAnnouncementsForUser<T = void>({
  args,
  spendingPublicKey,
  viewingPrivateKey,
  ERC5564Address,
  clientParams,
  excludeList,
  fromBlock,
  includeList,
  handleLogsForUser,
  onHeartbeat,
  onError,
  pollOptions
}: WatchAnnouncementsForUserParams<T>): Promise<WatchAnnouncementsForUserReturnType> {
  const publicClient = handleViemPublicClient(clientParams);
  const watchedAnnouncementsQueue = createWatchedAnnouncementsQueue({
    onUnexpectedError: async error => {
      await reportWatchError({
        error,
        fallbackMessage:
          'watchAnnouncementsForUser queue failed while processing a batch',
        onError
      });
    }
  });
  // Poll with getContractEvents directly so logs cannot slip through while an RPC filter is still being created.
  const unwatchContractEvent = await startPollingAnnouncementEvents({
    args,
    ERC5564Address,
    excludeList,
    fromBlock,
    handleLogsForUser,
    includeList,
    onError,
    pollOptions,
    publicClient,
    spendingPublicKey,
    viewingPrivateKey,
    watchedAnnouncementsQueue
  });

  const stopHeartbeat = startWatchHeartbeat({
    fromBlock,
    onError,
    onHeartbeat,
    pollingInterval: pollOptions?.pollingInterval,
    publicClient
  });

  return () => {
    stopHeartbeat();
    unwatchContractEvent();
  };
}

export default watchAnnouncementsForUser;
