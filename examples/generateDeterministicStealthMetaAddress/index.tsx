import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { type Address, createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import 'viem/window';

import { generateStealthMetaAddressFromSignature } from '@scopelift/stealth-address-sdk';

/**
 * This React component demonstrates the process of generating a stealth meta-address deterministically using a user-signed message
 * It's deterministic in that the same stealth meta-address is generated for the same user, chain id, and message
 * It utilizes Viem's walletClient for wallet interaction
 *
 * @returns The component renders a button to first handle connecting the wallet, and a subsequent button to handle stealth meta-address generation
 *
 * @example
 * To run the development server: `bun run dev`.
 */
const Example = () => {
  // Initialize your configuration
  const chain = sepolia; // Example Viem chain

  if (!window.ethereum) throw new Error('window.ethereum is required');

  // Initialize Viem wallet client if using Viem
  const walletClient = createWalletClient({
    chain,
    transport: custom(window.ethereum)
  });

  // State
  const [account, setAccount] = useState<Address>();
  const [stealthMetaAddress, setStealthMetaAddress] = useState<`0x${string}`>();

  const connect = async () => {
    const [address] = await walletClient.requestAddresses();
    setAccount(address);
  };

  const signMessage = async () => {
    // An example message to sign for generating the stealth meta-address
    // Usually this message includes the chain id to mitigate replay attacks across different chains
    // The message that is signed should clearly communicate to the user what they are signing and why
    const MESSAGE_TO_SIGN = `Generate Stealth Meta-Address on ${chain.id} chain`;

    if (!account) throw new Error('A connected account is required');

    const signature = await walletClient.signMessage({
      account,
      message: MESSAGE_TO_SIGN
    });

    return signature;
  };

  const handleSignAndGenStealthMetaAddress = async () => {
    const signature = await signMessage();
    const stealthMetaAddress =
      generateStealthMetaAddressFromSignature(signature);

    setStealthMetaAddress(stealthMetaAddress);
  };

  if (account)
    return (
      <>
        {!stealthMetaAddress ? (
          <button onClick={handleSignAndGenStealthMetaAddress} type="button">
            Generate Stealth Meta-Address
          </button>
        ) : (
          <div>Stealth Meta-Address: {stealthMetaAddress}</div>
        )}
        <div>Connected: {account}</div>
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
