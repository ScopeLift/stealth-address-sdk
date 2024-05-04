import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { type Address, createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import 'viem/window';

import {
  ERC5564_CONTRACT,
  VALID_SCHEME_ID,
  createStealthClient,
  generateStealthAddress
} from '@scopelift/stealth-address-sdk';

/**
 * This React component demonstrates the process of connecting to a wallet and announcing a stealth address.
 * It utilizes Viem's walletClient for wallet interaction and the stealth-address-sdk for stealth address operations.
 *
 * @returns The component renders a button to connect the wallet and announce the stealth address.
 *
 * @example
 * To run this example, ensure you have set up your environment variables VITE_RPC_URL and VITE_STEALTH_META_ADDRESS_URI.
 * Run the development server using Vite, `vite run dev`.
 */
const Example = () => {
  // Initialize your environment variables or configuration
  const chainId = 11155111; // Example chain ID
  const rpcUrl = import.meta.env.VITE_RPC_URL!; // Your Ethereum RPC URL
  // Example URI; see the getStealthMetaAddress example and generateRandomStealthMetaAddress helper for more details
  const stealthMetaAddressURI = import.meta.env.VITE_STEALTH_META_ADDRESS_URI!;
  const chain = sepolia; // Example Viem chain

  // Initialize Viem wallet client if using Viem
  const walletClient = createWalletClient({
    chain,
    transport: custom(window.ethereum!)
  });

  // Initialize the stealth client with your RPC URL and chain ID
  const stealthClient = createStealthClient({ rpcUrl, chainId });
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
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1 // Example scheme ID
      });

    // Prepare the announce payload
    const preparedPayload = await stealthClient.prepareAnnounce({
      account,
      ERC5564Address: ERC5564_CONTRACT.SEPOLIA,
      args: {
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
        stealthAddress,
        ephemeralPublicKey,
        metadata: viewTag
      }
    });

    await walletClient.sendTransaction({
      ...preparedPayload
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
