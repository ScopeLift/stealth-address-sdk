import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import StealthActionsExample from './components/stealth-actions-example';

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || 'https://1rpc.io/sepolia';
if (!RPC_URL) throw new Error('VITE_RPC_URL is required');

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(RPC_URL)
  }
});

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <StealthActionsExample />
      </WagmiProvider>
    </QueryClientProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
);
