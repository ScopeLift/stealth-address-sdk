import {
  type AnnouncementLog,
  scanAnnouncementsForUserUsingSubgraph
} from '@scopelift/stealth-address-sdk';
import React, { startTransition, useState } from 'react';
import ReactDOM from 'react-dom/client';

const subgraphUrl = import.meta.env.VITE_SUBGRAPH_URL;
const spendingPublicKey = import.meta.env.VITE_SPENDING_PUBLIC_KEY;
const viewingPrivateKey = import.meta.env.VITE_VIEWING_PRIVATE_KEY;
const fromBlock = Number.parseInt(import.meta.env.VITE_FROM_BLOCK, 10);
const toBlock = Number.parseInt(import.meta.env.VITE_TO_BLOCK, 10);

if (!subgraphUrl) throw new Error('VITE_SUBGRAPH_URL is required');
if (!spendingPublicKey) throw new Error('VITE_SPENDING_PUBLIC_KEY is required');
if (!viewingPrivateKey) throw new Error('VITE_VIEWING_PRIVATE_KEY is required');
if (Number.isNaN(fromBlock)) throw new Error('VITE_FROM_BLOCK is required');
if (Number.isNaN(toBlock)) throw new Error('VITE_TO_BLOCK is required');

const Example = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementLog[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [error, setError] = useState<string>();

  const startScan = async () => {
    setAnnouncements([]);
    setError(undefined);
    setIsFinished(false);
    setIsScanning(true);
    setScannedCount(0);

    try {
      for await (const batch of scanAnnouncementsForUserUsingSubgraph({
        fromBlock,
        spendingPublicKey,
        subgraphUrl,
        toBlock,
        viewingPrivateKey
      })) {
        startTransition(() => {
          setAnnouncements(current => current.concat(batch.announcements));
          setScannedCount(current => current + batch.scannedCount);
        });
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
    <>
      <button disabled={isScanning} onClick={startScan} type="button">
        {isScanning ? 'Scanning...' : 'Start Scan'}
      </button>
      <div>Scanned candidates: {scannedCount}</div>
      <div>User matches: {announcements.length}</div>
      {isFinished ? <div>Finished newest-to-oldest scan.</div> : null}
      {error ? <div>Error: {error}</div> : null}
      <ul>
        {announcements.map(announcement => (
          <li key={`${announcement.transactionHash}:${announcement.logIndex}`}>
            <div>Block: {announcement.blockNumber.toString()}</div>
            <div>Tx: {announcement.transactionHash}</div>
            <div>Stealth address: {announcement.stealthAddress}</div>
          </li>
        ))}
      </ul>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Example />
);
