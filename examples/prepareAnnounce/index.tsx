import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { type Address, createWalletClient, custom, parseUnits } from 'viem';
import { sepolia } from 'viem/chains';
import 'viem/window';

import {
  ERC5564_CONTRACT_ADDRESS,
  VALID_SCHEME_ID,
  buildMetadataForERC20,
  buildMetadataForETH,
  createStealthClient,
  generateStealthAddress
} from '@scopelift/stealth-address-sdk';

/**
 * This React component demonstrates the process of connecting to a wallet and announcing a stealth address.
 * It utilizes Viem's walletClient for wallet interaction and the stealth-address-sdk for stealth address operations.
 *
 * This example shows ERC-5564 compliant metadata building:
 * - ETH transfer metadata with amount
 * - ERC-20 token metadata with token address and amount
 *
 * @returns The component renders buttons to connect the wallet and announce different types of stealth addresses.
 *
 * @example
 * To run this example, ensure you have set up your environment variables VITE_RPC_URL and VITE_STEALTH_META_ADDRESS_URI.
 * Run the development server using Vite, `vite run dev`.
 */
const Example = () => {
  // Initialize your environment variables or configuration
  const chainId = 11155111; // Example chain ID
  const rpcUrl = import.meta.env.VITE_RPC_URL; // Your Ethereum RPC URL
  if (!rpcUrl) throw new Error('VITE_RPC_URL is required');

  // Example URI; see the getStealthMetaAddress example and generateRandomStealthMetaAddress helper for more details
  const stealthMetaAddressURI = import.meta.env.VITE_STEALTH_META_ADDRESS_URI;
  if (!stealthMetaAddressURI)
    throw new Error('VITE_STEALTH_META_ADDRESS_URI is required');

  const chain = sepolia; // Example Viem chain

  if (!window.ethereum) throw new Error('window.ethereum is required');

  // Initialize Viem wallet client if using Viem
  const walletClient = createWalletClient({
    chain,
    transport: custom(window.ethereum)
  });

  // Initialize the stealth client with your RPC URL and chain ID
  const stealthClient = createStealthClient({ rpcUrl, chainId });
  const [account, setAccount] = useState<Address>();

  const connect = async () => {
    const [address] = await walletClient.requestAddresses();
    setAccount(address);
  };

  // Example: ETH transfer announcement with amount metadata
  const announceETH = async () => {
    if (!account) return;

    // Generate stealth address details
    const { stealthAddress, ephemeralPublicKey, viewTag } =
      generateStealthAddress({
        stealthMetaAddressURI,
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1
      });

    // Build metadata for ETH transfer with amount
    const ethAmount = parseUnits('0.1', 18); // 0.1 ETH
    const metadata = buildMetadataForETH({
      viewTag,
      amount: ethAmount
    });

    const preparedPayload = await stealthClient.prepareAnnounce({
      account,
      ERC5564Address: ERC5564_CONTRACT_ADDRESS,
      args: {
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
        stealthAddress,
        ephemeralPublicKey,
        metadata
      }
    });

    await walletClient.sendTransaction({
      ...preparedPayload
    });
  };

  // Example: ERC-20 token announcement with token metadata
  const announceERC20 = async () => {
    if (!account) return;

    // Generate stealth address details
    const { stealthAddress, ephemeralPublicKey, viewTag } =
      generateStealthAddress({
        stealthMetaAddressURI,
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1
      });

    // Build metadata for ERC-20 token transfer
    const tokenAmount = parseUnits('100', 18); // 100 tokens
    const tokenAddress = '0xA0b86a33E6441E6837FD5E163Aa01879cBbD5bbD'; // Example token address
    const metadata = buildMetadataForERC20({
      viewTag,
      tokenAddress,
      amount: tokenAmount
    });

    const preparedPayload = await stealthClient.prepareAnnounce({
      account,
      ERC5564Address: ERC5564_CONTRACT_ADDRESS,
      args: {
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
        stealthAddress,
        ephemeralPublicKey,
        metadata
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '300px'
          }}
        >
          <button onClick={announceETH} type="button">
            Announce ETH Transfer (0.1 ETH)
          </button>
          <button onClick={announceERC20} type="button">
            Announce ERC-20 Transfer (100 tokens)
          </button>
        </div>
      </>
    );
  return (
    <button onClick={connect} type="button">
      Connect Wallet
    </button>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Example />
);
