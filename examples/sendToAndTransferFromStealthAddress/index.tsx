import React from 'react';
import ReactDOM from 'react-dom/client';
import StealthActionsExample from './components/stealth-actions-example';
import { WagmiProvider } from 'wagmi';
import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const rpcUrl = import.meta.env.VITE_RPC_URL;
if (!rpcUrl) throw new Error('VITE_RPC_URL is required');

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(rpcUrl)
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
