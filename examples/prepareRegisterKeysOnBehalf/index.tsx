import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { type Address, createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import 'viem/window';

import {
  ERC6538_CONTRACT_ADDRESS,
  VALID_SCHEME_ID,
  createStealthClient,
  parseStealthMetaAddressURI
} from '@scopelift/stealth-address-sdk';

/**
 * This React component demonstrates the process of connecting to a wallet and registering a stealth meta-address.
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
  const rpcUrl = import.meta.env.VITE_RPC_URL; // Your Ethereum RPC URL
  if (!rpcUrl) throw new Error('VITE_RPC_URL is required');

  // Example URI; see the getStealthMetaAddress example and generateRandomStealthMetaAddress helper for more details
  const stealthMetaAddressURI = import.meta.env.VITE_STEALTH_META_ADDRESS_URI;
  if (!stealthMetaAddressURI)
    throw new Error('VITE_STEALTH_META_ADDRESS_URI is required');

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const stealthMetaAddressToRegister = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId
  });
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

  const registerKeysOnBehalf = async () => {
    if (!account) return;

    // Prepare the registerKeys payload
    const preparedPayload = await stealthClient.prepareRegisterKeysOnBehalf({
      account, // Your wallet address
      ERC6538Address: ERC6538_CONTRACT_ADDRESS,
      args: {
        registrant: '0x', // Add the registrant address here
        schemeId,
        stealthMetaAddress: stealthMetaAddressToRegister,
        signature: '0x' // Add the signature here
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
        <button onClick={registerKeysOnBehalf} type="button">
          Register Stealth Meta-Address
        </button>
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
