import type {
  AnnouncementLog,
  GetAnnouncementsForUserParams,
  WatchAnnouncementsForUserParams,
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

export async function processWatchedAnnouncementsBatch<T = void>({
  logs,
  spendingPublicKey,
  viewingPrivateKey,
  publicClient,
  excludeList,
  includeList,
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

  try {
    await handleLogsForUser(relevantAnnouncements);
  } catch (error) {
    await reportWatchError({
      error,
      fallbackMessage:
        'watchAnnouncementsForUser handler failed while processing a batch',
      onError
    });
  }
}

/**
 * Watches for announcement events relevant to the user.
 *
 * @property {EthAddress} ERC5564Address - The Ethereum address of the ERC5564 contract.
 * @property {AnnouncementArgs} args - Arguments to filter the announcements.
 * @property {bigint | 'latest'} [fromBlock] - Optional lower inclusive block bound for the live watch.
 * @property {(logs: AnnouncementLog[]) => unknown} handleLogsForUser - Callback function to handle the filtered announcement logs.
 *   The SDK ignores the return value, but awaits any returned promise before moving to the next batch.
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

  const unwatch = publicClient.watchContractEvent({
    address: ERC5564Address,
    abi: ERC5564AnnouncerAbi,
    eventName: 'Announcement',
    args,
    ...(fromBlock === 'latest' ? {} : { fromBlock }),
    onLogs: logs => {
      watchedAnnouncementsQueue.enqueue(async () => {
        await processWatchedAnnouncementsBatch({
          logs,
          spendingPublicKey,
          viewingPrivateKey,
          publicClient,
          excludeList,
          includeList,
          handleLogsForUser,
          onError
        });
      });
    },
    strict: true,
    ...pollOptions
  });

  return unwatch;
}

export default watchAnnouncementsForUser;
