import {
  ERC5564_CONTRACT_ADDRESS,
  VALID_SCHEME_ID,
  createStealthClient
} from '@scopelift/stealth-address-sdk';
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

const DEFAULT_CHAIN_ID = import.meta.env.VITE_CHAIN_ID ?? '11155111';
const DEFAULT_RPC_URL = import.meta.env.VITE_RPC_URL ?? '';
const DEFAULT_SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL ?? '';
const DEFAULT_SPENDING_PUBLIC_KEY =
  import.meta.env.VITE_SPENDING_PUBLIC_KEY ?? '';
const DEFAULT_VIEWING_PRIVATE_KEY =
  import.meta.env.VITE_VIEWING_PRIVATE_KEY ?? '';
const DEFAULT_CALLER = import.meta.env.VITE_CALLER ?? '';
const DEFAULT_FROM_BLOCK = import.meta.env.VITE_FROM_BLOCK ?? '';
const DEFAULT_PAGE_SIZE = import.meta.env.VITE_PAGE_SIZE ?? '100';
const DEFAULT_POLLING_INTERVAL =
  import.meta.env.VITE_POLLING_INTERVAL ?? '1000';

const queryClient = new QueryClient();

type ExampleChainId = Parameters<typeof createStealthClient>[0]['chainId'];

type AppliedConfig = {
  caller?: `0x${string}`;
  chainId: ExampleChainId;
  erc5564Address: `0x${string}`;
  fromBlock?: number;
  pageSize: number;
  pollingInterval: number;
  rpcUrl: string;
  spendingPublicKey: `0x${string}`;
  subgraphUrl: string;
  viewingPrivateKey: `0x${string}`;
};

type PersistedAnnouncement = {
  blockNumber: string;
  caller: string;
  id: string;
  logIndex: number;
  schemeId: string;
  source: 'history' | 'live';
  stealthAddress: string;
  transactionHash: string;
  transactionIndex: number;
};

type HistoryPageParam =
  | {
      cursor: string;
      snapshotBlock: bigint;
    }
  | undefined;

function parseRequiredNumber(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a whole number`);
  }

  return parsed;
}

function parseOptionalNumber(
  value: string,
  fieldName: string
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  return parseRequiredNumber(value, fieldName);
}

function createInboxKey(config: AppliedConfig): string {
  return [
    'stealth-address-sdk',
    'announcement-inbox',
    config.chainId,
    config.subgraphUrl,
    config.spendingPublicKey,
    config.caller ?? 'all-callers',
    config.fromBlock ?? 'earliest'
  ].join('::');
}

function toPersistedAnnouncement(
  announcement: Awaited<
    ReturnType<
      ReturnType<typeof createStealthClient>['getAnnouncementsForUser']
    >
  >[number],
  source: PersistedAnnouncement['source']
): PersistedAnnouncement {
  return {
    blockNumber: announcement.blockNumber?.toString() ?? '0',
    caller: announcement.caller,
    id: `${announcement.transactionHash ?? 'missing'}:${
      announcement.logIndex ?? 0
    }`,
    logIndex: announcement.logIndex ?? 0,
    schemeId: announcement.schemeId.toString(),
    source,
    stealthAddress: announcement.stealthAddress,
    transactionHash: announcement.transactionHash ?? 'missing',
    transactionIndex: announcement.transactionIndex ?? 0
  };
}

function comparePersistedAnnouncements(
  left: PersistedAnnouncement,
  right: PersistedAnnouncement
): number {
  const leftBlockNumber = BigInt(left.blockNumber);
  const rightBlockNumber = BigInt(right.blockNumber);

  if (leftBlockNumber !== rightBlockNumber) {
    return leftBlockNumber > rightBlockNumber ? -1 : 1;
  }

  if (left.transactionIndex !== right.transactionIndex) {
    return left.transactionIndex > right.transactionIndex ? -1 : 1;
  }

  if (left.logIndex !== right.logIndex) {
    return left.logIndex > right.logIndex ? -1 : 1;
  }

  return 0;
}

function mergeAnnouncements(
  current: PersistedAnnouncement[],
  incoming: PersistedAnnouncement[]
): PersistedAnnouncement[] {
  const merged = new Map(
    current.map(announcement => [announcement.id, announcement])
  );

  for (const announcement of incoming) {
    merged.set(announcement.id, announcement);
  }

  return [...merged.values()].sort(comparePersistedAnnouncements);
}

function getAppliedConfig({
  caller,
  chainId,
  fromBlock,
  pageSize,
  pollingInterval,
  rpcUrl,
  spendingPublicKey,
  subgraphUrl,
  viewingPrivateKey
}: {
  caller: string;
  chainId: string;
  fromBlock: string;
  pageSize: string;
  pollingInterval: string;
  rpcUrl: string;
  spendingPublicKey: string;
  subgraphUrl: string;
  viewingPrivateKey: string;
}): AppliedConfig {
  if (!rpcUrl.trim()) {
    throw new Error('RPC URL is required');
  }

  if (!subgraphUrl.trim()) {
    throw new Error('Subgraph URL is required');
  }

  if (!spendingPublicKey.trim()) {
    throw new Error('Spending public key is required');
  }

  if (!viewingPrivateKey.trim()) {
    throw new Error('Viewing private key is required');
  }

  return {
    caller: caller.trim() ? (caller.trim() as `0x${string}`) : undefined,
    chainId: parseRequiredNumber(chainId, 'Chain ID') as ExampleChainId,
    erc5564Address: ERC5564_CONTRACT_ADDRESS,
    fromBlock: parseOptionalNumber(fromBlock, 'From block'),
    pageSize: parseRequiredNumber(pageSize, 'Page size'),
    pollingInterval: parseRequiredNumber(pollingInterval, 'Polling interval'),
    rpcUrl: rpcUrl.trim(),
    spendingPublicKey: spendingPublicKey.trim() as `0x${string}`,
    subgraphUrl: subgraphUrl.trim(),
    viewingPrivateKey: viewingPrivateKey.trim() as `0x${string}`
  };
}

function InboxExample() {
  const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID);
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_RPC_URL);
  const [subgraphUrl, setSubgraphUrl] = useState(DEFAULT_SUBGRAPH_URL);
  const [spendingPublicKey, setSpendingPublicKey] = useState(
    DEFAULT_SPENDING_PUBLIC_KEY
  );
  const [viewingPrivateKey, setViewingPrivateKey] = useState(
    DEFAULT_VIEWING_PRIVATE_KEY
  );
  const [caller, setCaller] = useState(DEFAULT_CALLER);
  const [fromBlock, setFromBlock] = useState(DEFAULT_FROM_BLOCK);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pollingInterval, setPollingInterval] = useState(
    DEFAULT_POLLING_INTERVAL
  );
  const [appliedConfig, setAppliedConfig] = useState<AppliedConfig | null>(
    null
  );
  const [configError, setConfigError] = useState<string>();
  const [liveError, setLiveError] = useState<string>();
  const [sessionAnnouncements, setSessionAnnouncements] = useState<
    PersistedAnnouncement[]
  >([]);
  const [sessionSnapshotBlock, setSessionSnapshotBlock] = useState<
    bigint | undefined
  >();
  const [sessionLiveFromBlock, setSessionLiveFromBlock] = useState<
    bigint | undefined
  >();
  const [latestObservedBlock, setLatestObservedBlock] = useState<
    bigint | undefined
  >();
  const [lastHeartbeatTimestamp, setLastHeartbeatTimestamp] = useState<
    number | undefined
  >();

  const inboxKey = appliedConfig
    ? createInboxKey(appliedConfig)
    : 'stealth-address-sdk::announcement-inbox::idle';

  const historyQuery = useInfiniteQuery({
    enabled: appliedConfig !== null,
    initialPageParam: undefined as HistoryPageParam,
    queryKey: ['announcement-history', inboxKey] as const,
    queryFn: async ({ pageParam }) => {
      if (!appliedConfig) {
        throw new Error('Configuration is required before opening the inbox');
      }

      const client = createStealthClient({
        chainId: appliedConfig.chainId,
        rpcUrl: appliedConfig.rpcUrl
      });

      const announcementArgs = {
        schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1),
        ...(appliedConfig.caller ? { caller: appliedConfig.caller } : {})
      };

      const page = pageParam
        ? await client.getAnnouncementsPageUsingSubgraph({
            ...announcementArgs,
            cursor: pageParam.cursor,
            fromBlock: appliedConfig.fromBlock,
            pageSize: appliedConfig.pageSize,
            snapshotBlock: pageParam.snapshotBlock,
            subgraphUrl: appliedConfig.subgraphUrl
          })
        : await client.getAnnouncementsPageUsingSubgraph({
            ...announcementArgs,
            fromBlock: appliedConfig.fromBlock,
            pageSize: appliedConfig.pageSize,
            subgraphUrl: appliedConfig.subgraphUrl
          });

      const relevantAnnouncements = await client.getAnnouncementsForUser({
        announcements: page.announcements,
        spendingPublicKey: appliedConfig.spendingPublicKey,
        viewingPrivateKey: appliedConfig.viewingPrivateKey
      });

      return {
        announcements: relevantAnnouncements.map(announcement =>
          toPersistedAnnouncement(announcement, 'history')
        ),
        nextCursor: page.nextCursor,
        scannedCount: page.announcements.length,
        snapshotBlock: page.snapshotBlock
      };
    },
    getNextPageParam: lastPage =>
      lastPage.nextCursor
        ? {
            cursor: lastPage.nextCursor,
            snapshotBlock: lastPage.snapshotBlock
          }
        : undefined,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY
  });

  useEffect(() => {
    if (
      appliedConfig === null ||
      historyQuery.status !== 'success' ||
      historyQuery.isFetchingNextPage ||
      !historyQuery.hasNextPage
    ) {
      return;
    }

    void historyQuery.fetchNextPage();
  }, [
    appliedConfig,
    historyQuery.fetchNextPage,
    historyQuery.hasNextPage,
    historyQuery.isFetchingNextPage,
    historyQuery.status
  ]);

  useEffect(() => {
    if (appliedConfig === null || historyQuery.status !== 'success') {
      return;
    }

    const historicalAnnouncements = historyQuery.data.pages.flatMap(
      page => page.announcements
    );

    setSessionAnnouncements(current =>
      mergeAnnouncements(current, historicalAnnouncements)
    );
    setSessionSnapshotBlock(historyQuery.data.pages[0]?.snapshotBlock);
  }, [appliedConfig, historyQuery.data, historyQuery.status]);

  useEffect(() => {
    if (
      appliedConfig === null ||
      historyQuery.status !== 'success' ||
      historyQuery.hasNextPage ||
      historyQuery.isFetchingNextPage
    ) {
      return;
    }

    const snapshotBlock = historyQuery.data.pages[0]?.snapshotBlock;
    if (snapshotBlock === undefined) {
      return;
    }

    const liveFromBlock = snapshotBlock + 1n;
    const client = createStealthClient({
      chainId: appliedConfig.chainId,
      rpcUrl: appliedConfig.rpcUrl
    });
    const announcementArgs = {
      schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1),
      ...(appliedConfig.caller ? { caller: appliedConfig.caller } : {})
    };

    let unwatch: undefined | (() => void);
    let cancelled = false;

    setLiveError(undefined);

    void (async () => {
      try {
        unwatch = await client.watchAnnouncementsForUser({
          ERC5564Address: appliedConfig.erc5564Address,
          args: announcementArgs,
          fromBlock: liveFromBlock,
          handleLogsForUser: async logs => {
            if (cancelled || logs.length === 0) {
              return;
            }

            const liveAnnouncements = logs.map(announcement =>
              toPersistedAnnouncement(announcement, 'live')
            );

            setSessionAnnouncements(current =>
              mergeAnnouncements(current, liveAnnouncements)
            );
          },
          onHeartbeat: meta => {
            if (cancelled) {
              return;
            }

            setLatestObservedBlock(meta.observedBlock);
            setLastHeartbeatTimestamp(meta.pollTimestamp);
          },
          onError: error => {
            if (!cancelled) {
              setLiveError(error.message);
            }
          },
          pollOptions: {
            pollingInterval: appliedConfig.pollingInterval
          },
          spendingPublicKey: appliedConfig.spendingPublicKey,
          viewingPrivateKey: appliedConfig.viewingPrivateKey
        });

        setSessionSnapshotBlock(snapshotBlock);
        setSessionLiveFromBlock(liveFromBlock);
      } catch (error) {
        if (!cancelled) {
          setLiveError(
            error instanceof Error
              ? error.message
              : 'Failed to start live watch'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      unwatch?.();
    };
  }, [
    appliedConfig,
    historyQuery.data,
    historyQuery.hasNextPage,
    historyQuery.isFetchingNextPage,
    historyQuery.status
  ]);

  const openInbox = () => {
    try {
      const nextConfig = getAppliedConfig({
        caller,
        chainId,
        fromBlock,
        pageSize,
        pollingInterval,
        rpcUrl,
        spendingPublicKey,
        subgraphUrl,
        viewingPrivateKey
      });
      const nextInboxKey = createInboxKey(nextConfig);

      queryClient.removeQueries({
        queryKey: ['announcement-history', nextInboxKey]
      });
      setAppliedConfig(nextConfig);
      setConfigError(undefined);
      setLiveError(undefined);
      setSessionAnnouncements([]);
      setSessionSnapshotBlock(undefined);
      setSessionLiveFromBlock(undefined);
      setLatestObservedBlock(undefined);
      setLastHeartbeatTimestamp(undefined);
    } catch (error) {
      setConfigError(
        error instanceof Error ? error.message : 'Failed to apply settings'
      );
    }
  };

  const resetSessionInbox = () => {
    if (appliedConfig !== null) {
      queryClient.removeQueries({
        queryKey: ['announcement-history', createInboxKey(appliedConfig)]
      });
    }

    setAppliedConfig(null);
    setConfigError(undefined);
    setLiveError(undefined);
    setSessionAnnouncements([]);
    setSessionSnapshotBlock(undefined);
    setSessionLiveFromBlock(undefined);
    setLatestObservedBlock(undefined);
    setLastHeartbeatTimestamp(undefined);
  };

  let syncState = 'Idle';
  if (appliedConfig !== null) {
    if (
      historyQuery.status === 'pending' ||
      historyQuery.isFetchingNextPage ||
      historyQuery.hasNextPage
    ) {
      syncState = 'Catching up';
    } else if (historyQuery.status === 'error') {
      syncState = 'Failed';
    } else {
      syncState = 'Live';
    }
  }

  const scannedCount =
    historyQuery.data?.pages.reduce(
      (count, page) => count + page.scannedCount,
      0
    ) ?? 0;
  const blocksSinceSnapshot =
    latestObservedBlock !== undefined && sessionSnapshotBlock !== undefined
      ? latestObservedBlock - sessionSnapshotBlock
      : undefined;
  const blocksSinceLiveWatchStart =
    latestObservedBlock !== undefined && sessionLiveFromBlock !== undefined
      ? latestObservedBlock - sessionLiveFromBlock
      : undefined;

  return (
    <main
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        margin: '0 auto',
        maxWidth: '1120px',
        padding: '24px'
      }}
    >
      <h1>History + Live Inbox Composition</h1>
      <p>
        This example keeps an in-memory inbox for the current page session,
        catches up historical pages against one pinned `snapshotBlock`, then
        starts live watching from `snapshotBlock + 1n`.
      </p>

      <div
        style={{
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          marginBottom: '16px'
        }}
      >
        <label>
          <div>Chain ID</div>
          <input
            onChange={event => setChainId(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={chainId}
          />
        </label>
        <label>
          <div>RPC URL</div>
          <input
            onChange={event => setRpcUrl(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={rpcUrl}
          />
        </label>
        <label>
          <div>Subgraph URL</div>
          <input
            onChange={event => setSubgraphUrl(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={subgraphUrl}
          />
        </label>
        <label>
          <div>Spending public key</div>
          <input
            onChange={event => setSpendingPublicKey(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={spendingPublicKey}
          />
        </label>
        <label>
          <div>Viewing private key</div>
          <input
            onChange={event => setViewingPrivateKey(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={viewingPrivateKey}
          />
        </label>
        <label>
          <div>Caller filter (optional)</div>
          <input
            onChange={event => setCaller(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={caller}
          />
        </label>
        <label>
          <div>From block (optional)</div>
          <input
            onChange={event => setFromBlock(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={fromBlock}
          />
        </label>
        <label>
          <div>Page size</div>
          <input
            onChange={event => setPageSize(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={pageSize}
          />
        </label>
        <label>
          <div>Watch polling interval (ms)</div>
          <input
            onChange={event => setPollingInterval(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={pollingInterval}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button onClick={openInbox} type="button">
          Open inbox
        </button>
        <button onClick={resetSessionInbox} type="button">
          Clear session
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div>Sync state: {syncState}</div>
        <div>History pages loaded: {historyQuery.data?.pages.length ?? 0}</div>
        <div>Candidate announcements scanned: {scannedCount}</div>
        <div>Session inbox size: {sessionAnnouncements.length}</div>
        <div>
          Latest observed block:{' '}
          {latestObservedBlock !== undefined
            ? latestObservedBlock.toString()
            : 'pending'}
        </div>
        <div>
          Last watch heartbeat:{' '}
          {lastHeartbeatTimestamp !== undefined
            ? new Date(lastHeartbeatTimestamp).toLocaleTimeString()
            : 'pending'}
        </div>
        <div>
          Snapshot block:{' '}
          {sessionSnapshotBlock !== undefined
            ? sessionSnapshotBlock.toString()
            : 'pending'}
        </div>
        <div>
          Live watch from block:{' '}
          {sessionLiveFromBlock !== undefined
            ? sessionLiveFromBlock.toString()
            : 'pending'}
        </div>
        <div>
          Blocks since snapshot:{' '}
          {blocksSinceSnapshot !== undefined
            ? blocksSinceSnapshot.toString()
            : 'pending'}
        </div>
        <div>
          Blocks since live watch start:{' '}
          {blocksSinceLiveWatchStart !== undefined
            ? blocksSinceLiveWatchStart.toString()
            : 'pending'}
        </div>
        <div>
          Catch-up runs against one pinned snapshot. Live watching only starts
          after the terminal history page and begins at `snapshotBlock + 1n`.
        </div>
        {configError ? <div>Error: {configError}</div> : null}
        {historyQuery.error ? (
          <div>Error: {historyQuery.error.message}</div>
        ) : null}
        {liveError ? <div>Live watch error: {liveError}</div> : null}
      </div>

      <ul style={{ marginTop: '16px', paddingLeft: '20px' }}>
        {sessionAnnouncements.map(announcement => (
          <li key={announcement.id}>
            <div>Source: {announcement.source}</div>
            <div>Block: {announcement.blockNumber}</div>
            <div>Tx: {announcement.transactionHash}</div>
            <div>Caller: {announcement.caller}</div>
            <div>Stealth address: {announcement.stealthAddress}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <InboxExample />
  </QueryClientProvider>
);
