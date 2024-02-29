import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Address, createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import 'viem/window';

import {
  createStealthClient,
  ERC5564_CONTRACT,
  generateStealthAddress,
  VALID_SCHEME_ID,
} from 'stealth-address-sdk';

// Initialize your environment variables or configuration
const chainId = 11155111; // Example chain ID
const rpcUrl = import.meta.env.VITE_RPC_URL!; // Your Ethereum RPC URL
// Example  URI; see the getStealthMetaAddress example and generateRandomStealthMetaAddress helper for more details
const stealthMetaAddressURI = import.meta.env.VITE_STEALTH_META_ADDRESS_URI!;
const chain = sepolia; // Example Viem chain

// Initialize Viem wallet client if using Viem
const walletClient = createWalletClient({
  chain,
  transport: custom(window.ethereum!),
});

// Initialize the stealth client with your RPC URL and chain ID
const stealthClient = createStealthClient({ rpcUrl, chainId });

const Example = () => {
  const [account, setAccount] = useState<Address>();

  const connect = async () => {
    const [address] = await walletClient.requestAddresses();
    setAccount(address);
  };

  const announce = async () => {
    if (!account) return;

    // Generate stealth address details
    const { stealthAddress, ephemeralPublicKey, viewTag } =
      generateStealthAddress({
        stealthMetaAddressURI,
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1, // Example scheme ID
      });

    // Prepare the announce payload
    const preparedPayload = await stealthClient.prepareAnnounce({
      account,
      ERC5564Address: ERC5564_CONTRACT.SEPOLIA,
      args: {
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
        stealthAddress,
        ephemeralPublicKey,
        metadata: viewTag,
      },
    });

    await walletClient.sendTransaction({
      ...preparedPayload,
    });
  };

  if (account)
    return (
      <>
        <div>Connected: {account}</div>
        <button onClick={announce}>Announce Stealth Address</button>
      </>
    );
  return <button onClick={connect}>Connect Wallet</button>;
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Example />
);
