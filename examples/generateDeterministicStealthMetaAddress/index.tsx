import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Address, createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import "viem/window";

import { getStealthMetaAddressFromSignature } from "@scopelift/stealth-address-sdk";

/**
 * This React component demonstrates the process of generating a stealth meta-address deterministically using a user-signed message
 * It's deterministic in that the same stealth meta-address is generated for the same user, chain id, and message
 * It utilizes Viem's walletClient for wallet interaction
 *
 * @returns The component renders a button to handle both wallet connection and stealth meta-address generation
 *
 * @example
 * To run this example, ensure you have set up your environment variable VITE_RPC_URL.
 * Run the development server using Vite, `vite run dev`.
 */
const Example = () => {
  // Initialize your environment variables or configuration
  const chain = sepolia; // Example Viem chain
  const rpcUrl = import.meta.env.VITE_RPC_URL; // Your Ethereum RPC URL
  if (!rpcUrl) throw new Error("RPC URL is required");

  // Initialize Viem wallet client if using Viem
  const walletClient = createWalletClient({
    chain,
    transport: custom(window.ethereum!),
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
    // Usually this message includes the chain id to mitigate replay attacks
    // The message that is signed should clearly communicate to the user what they are signing and why
    const MESSAGE_TO_SIGN = `Generate Stealth Meta-Address on ${chain.id} chain`;

    if (!account) throw new Error("Account is required");

    const signature = await walletClient.signMessage({
      account,
      message: MESSAGE_TO_SIGN,
    });

    return signature;
  };

  const handleSignAndGetStealthMetaAddress = async () => {
    const signature = await signMessage();
    const stealthMetaAddress =
      await getStealthMetaAddressFromSignature(signature);
    setStealthMetaAddress(stealthMetaAddress);
  };

  if (account)
    return (
      <>
        {!stealthMetaAddress ? (
          <button onClick={handleSignAndGetStealthMetaAddress}>
            Generate Stealth Meta-Address
          </button>
        ) : (
          <div>Stealth Meta-Address: {stealthMetaAddress}</div>
        )}
        <div>Connected: {account}</div>
      </>
    );

  return <button onClick={connect}>Connect Wallet</button>;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Example />
);
