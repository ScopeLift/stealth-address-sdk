import {
  type AnnouncementLog,
  scanAnnouncementsForUserUsingSubgraph
} from '@scopelift/stealth-address-sdk';
import { startTransition, useState } from 'react';
import ReactDOM from 'react-dom/client';

const DEFAULT_SUBGRAPH_URL =
  import.meta.env.VITE_SUBGRAPH_URL ??
  'https://subgraph.satsuma-prod.com/760e79467576/scopelift/stealth-address-erc-mainnet';
const DEFAULT_FROM_BLOCK = import.meta.env.VITE_FROM_BLOCK ?? '';
const DEFAULT_TO_BLOCK = import.meta.env.VITE_TO_BLOCK ?? '';
const DEFAULT_SPENDING_PUBLIC_KEY =
  import.meta.env.VITE_SPENDING_PUBLIC_KEY ?? '';
const DEFAULT_VIEWING_PRIVATE_KEY =
  import.meta.env.VITE_VIEWING_PRIVATE_KEY ?? '';
const DEFAULT_PAGE_SIZE = import.meta.env.VITE_PAGE_SIZE ?? '250';

type ScanConfig = {
  subgraphUrl: string;
  spendingPublicKey: `0x${string}`;
  viewingPrivateKey: `0x${string}`;
  fromBlock?: number;
  toBlock?: number;
  pageSize?: number;
};

function parseOptionalNumber(
  value: string,
  fieldName: string
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a whole number`);
  }

  return parsed;
}

function getScanConfig({
  fromBlock,
  pageSize,
  spendingPublicKey,
  subgraphUrl,
  toBlock,
  viewingPrivateKey
}: {
  fromBlock: string;
  pageSize: string;
  spendingPublicKey: string;
  subgraphUrl: string;
  toBlock: string;
  viewingPrivateKey: string;
}): ScanConfig {
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
    fromBlock: parseOptionalNumber(fromBlock, 'From block'),
    pageSize: parseOptionalNumber(pageSize, 'Page size'),
    spendingPublicKey: spendingPublicKey.trim() as `0x${string}`,
    subgraphUrl: subgraphUrl.trim(),
    toBlock: parseOptionalNumber(toBlock, 'To block'),
    viewingPrivateKey: viewingPrivateKey.trim() as `0x${string}`
  };
}

function waitForNextPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

const Example = () => {
  const [subgraphUrl, setSubgraphUrl] = useState(DEFAULT_SUBGRAPH_URL);
  const [spendingPublicKey, setSpendingPublicKey] = useState(
    DEFAULT_SPENDING_PUBLIC_KEY
  );
  const [viewingPrivateKey, setViewingPrivateKey] = useState(
    DEFAULT_VIEWING_PRIVATE_KEY
  );
  const [fromBlock, setFromBlock] = useState(DEFAULT_FROM_BLOCK);
  const [toBlock, setToBlock] = useState(DEFAULT_TO_BLOCK);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [announcements, setAnnouncements] = useState<AnnouncementLog[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [batchCount, setBatchCount] = useState(0);
  const [lastCursor, setLastCursor] = useState<string>();
  const [snapshotBlock, setSnapshotBlock] = useState<string>();
  const [error, setError] = useState<string>();

  const startScan = async () => {
    setAnnouncements([]);
    setError(undefined);
    setIsFinished(false);
    setIsScanning(true);
    setScannedCount(0);
    setBatchCount(0);
    setLastCursor(undefined);
    setSnapshotBlock(undefined);

    try {
      const config = getScanConfig({
        fromBlock,
        pageSize,
        spendingPublicKey,
        subgraphUrl,
        toBlock,
        viewingPrivateKey
      });

      for await (const batch of scanAnnouncementsForUserUsingSubgraph(config)) {
        startTransition(() => {
          setAnnouncements(current => current.concat(batch.announcements));
          setScannedCount(current => current + batch.scannedCount);
          setBatchCount(current => current + 1);
          setLastCursor(batch.nextCursor);
          setSnapshotBlock(batch.snapshotBlock.toString());
        });

        await waitForNextPaint();
      }

      setIsFinished(true);
    } catch (scanError) {
      const message =
        scanError instanceof Error ? scanError.message : 'Scan failed';
      setError(message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <main
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        margin: '0 auto',
        maxWidth: '960px',
        padding: '24px'
      }}
    >
      <h1>Streaming Subgraph Scan</h1>
      <p>
        Enter the recipient scan keys and bounds, then stream matches page by
        page. Each page is sorted newest to oldest internally.
      </p>

      <div
        style={{
          display: 'grid',
          gap: '12px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          marginBottom: '16px'
        }}
      >
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
          <div>From block</div>
          <input
            onChange={event => setFromBlock(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={fromBlock}
          />
        </label>
        <label>
          <div>To block</div>
          <input
            onChange={event => setToBlock(event.target.value)}
            style={{ width: '100%' }}
            type="text"
            value={toBlock}
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
      </div>

      <button disabled={isScanning} onClick={startScan} type="button">
        {isScanning ? 'Scanning...' : 'Start scan'}
      </button>

      <div style={{ marginTop: '16px' }}>
        <div>Pages scanned: {batchCount}</div>
        <div>Candidates scanned: {scannedCount}</div>
        <div>User matches: {announcements.length}</div>
        <div>
          Incremental updates appear once the scan spans more than one page. Use
          a page size smaller than the candidate count to see streaming in
          action.
        </div>
        <div>Latest cursor: {lastCursor ?? 'none'}</div>
        <div>Snapshot block: {snapshotBlock ?? 'pending'}</div>
        {isFinished ? <div>Finished paged scan.</div> : null}
        {error ? <div>Error: {error}</div> : null}
      </div>

      <ul style={{ marginTop: '16px', paddingLeft: '20px' }}>
        {announcements.map(announcement => (
          <li key={`${announcement.transactionHash}:${announcement.logIndex}`}>
            <div>
              Block: {announcement.blockNumber?.toString() ?? 'unknown'}
            </div>
            <div>Tx: {announcement.transactionHash ?? 'missing'}</div>
            <div>Stealth address: {announcement.stealthAddress}</div>
          </li>
        ))}
      </ul>
    </main>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Example />
);
