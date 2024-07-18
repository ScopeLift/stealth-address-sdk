import {
  type GenerateStealthAddressReturnType,
  VALID_SCHEME_ID,
  computeStealthKey,
  generateKeysFromSignature,
  generateStealthAddress,
  generateStealthMetaAddressFromSignature
} from '@scopelift/stealth-address-sdk';
import React, { useEffect, useState } from 'react';
import {
  http,
  type Address,
  createWalletClient,
  custom,
  formatEther,
  parseEther
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import 'viem/window';
import { useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { RPC_URL } from '..';

const StealthActionsExample = () => {
  if (!window.ethereum) throw new Error('window.ethereum is required');

  const CHAIN = sepolia;
  const SCHEME_ID = VALID_SCHEME_ID.SCHEME_ID_1;
  const MESSAGE_TO_SIGN = `Generate Stealth Meta-Address on ${CHAIN.id} chain`;
  const SEND_AMOUNT = '0.01';
  const WITHDRAW_AMOUNT = '0.005';

  const walletClient = createWalletClient({
    chain: CHAIN,
    transport: custom(window.ethereum)
  });

  const [connectedAccount, setConnectedAccount] = useState<Address>();
  const [keys, setKeys] = useState<{
    spendingPublicKey: `0x${string}`;
    spendingPrivateKey: `0x${string}`;
    viewingPublicKey: `0x${string}`;
    viewingPrivateKey: `0x${string}`;
  }>();
  const [stealthAddressDetails, setStealthAddressDetails] =
    useState<GenerateStealthAddressReturnType>();
  const [sendToStealthTxHash, setSendToStealthTxHash] =
    useState<`0x${string}`>();
  const [transferFromStealthTxHash, setTransferFromStealthTxHash] =
    useState<`0x${string}`>();
  const [error, setError] = useState<string | null>(null);

  enum CurrentStep {
    GENERATE_STEALTH_ADDRESS = 1,
    SEND_TO_STEALTH_ADDRESS = 2,
    TRANSFER_FROM_STEALTH_ADDRESS = 3,
    TRANSFER_FROM_STEALTH_ADDRESS_COMPLETE = 4
  }

  const [currentStep, setCurrentStep] = useState(
    CurrentStep.GENERATE_STEALTH_ADDRESS
  );

  const {
    isLoading: isLoadingSendToStealthTx,
    isSuccess: isSuccessSendToStealthTx
  } = useWaitForTransactionReceipt({ hash: sendToStealthTxHash });
  const {
    isLoading: isLoadingTransferFromStealthTx,
    isSuccess: isSuccessTransferFromStealthTx
  } = useWaitForTransactionReceipt({ hash: transferFromStealthTxHash });

  const {
    data: connectedAccountBalance,
    isLoading: isConnectedAccountBalanceLoading,
    refetch: refetchConnectedAccountBalance
  } = useBalance({
    address: connectedAccount
  });

  const {
    data: stealthAddressBalance,
    isLoading: isStealthAddressBalanceLoading,
    refetch: refetchStealthAddressBalance
  } = useBalance({
    address: stealthAddressDetails?.stealthAddress
  });

  const connect = async () => {
    try {
      const [address] = await walletClient.requestAddresses();
      setConnectedAccount(address);
      setCurrentStep(CurrentStep.GENERATE_STEALTH_ADDRESS);
    } catch (error) {
      handleError('Error connecting wallet');
    }
  };

  const getSignature = async ({ message }: { message: string }) => {
    if (!connectedAccount) throw new Error('A connected account is required');
    return await walletClient.signMessage({
      message,
      account: connectedAccount
    });
  };

  const getStealthAddressDetails = async () => {
    try {
      const signature = await getSignature({ message: MESSAGE_TO_SIGN });
      const newKeys = generateKeysFromSignature(signature);
      setKeys(newKeys);
      const stealthMetaAddress =
        generateStealthMetaAddressFromSignature(signature);
      const details = generateStealthAddress({
        stealthMetaAddressURI: stealthMetaAddress,
        schemeId: SCHEME_ID
      });
      setStealthAddressDetails(details);
      setCurrentStep(CurrentStep.SEND_TO_STEALTH_ADDRESS);
    } catch (error) {
      handleError('Error generating stealth address');
    }
  };

  const sendToStealthAddress = async () => {
    if (!connectedAccount || !stealthAddressDetails)
      return handleError('Missing account or stealth address details');

    try {
      const hash = await walletClient.sendTransaction({
        account: connectedAccount,
        to: stealthAddressDetails.stealthAddress,
        value: parseEther(SEND_AMOUNT)
      });
      setSendToStealthTxHash(hash);
      setCurrentStep(CurrentStep.TRANSFER_FROM_STEALTH_ADDRESS);
    } catch (error) {
      handleError('Error sending to stealth address');
    }
  };

  const transferFromStealthAddress = async () => {
    if (!connectedAccount || !keys || !stealthAddressDetails)
      return handleError('Missing account, keys, or stealth address details');

    try {
      const stealthPrivateKey = computeStealthKey({
        schemeId: SCHEME_ID,
        ephemeralPublicKey: stealthAddressDetails.ephemeralPublicKey,
        spendingPrivateKey: keys.spendingPrivateKey,
        viewingPrivateKey: keys.viewingPrivateKey
      });

      const stealthAddressAccount = privateKeyToAccount(stealthPrivateKey);
      const stealthWalletClient = createWalletClient({
        account: stealthAddressAccount,
        chain: CHAIN,
        transport: http(RPC_URL)
      });

      const hash = await stealthWalletClient.sendTransaction({
        to: connectedAccount,
        value: parseEther(WITHDRAW_AMOUNT)
      });
      setTransferFromStealthTxHash(hash);
      setCurrentStep(CurrentStep.TRANSFER_FROM_STEALTH_ADDRESS_COMPLETE);
    } catch (error) {
      handleError('Error transferring from stealth address');
    }
  };

  const handleError = (msg: string) => {
    console.error(msg);
    setError(msg);
    setCurrentStep(CurrentStep.GENERATE_STEALTH_ADDRESS);
  };

  useEffect(() => {
    if (isSuccessSendToStealthTx || isSuccessTransferFromStealthTx) {
      refetchStealthAddressBalance();
      refetchConnectedAccountBalance();
    }
  }, [
    isSuccessSendToStealthTx,
    isSuccessTransferFromStealthTx,
    refetchConnectedAccountBalance,
    refetchStealthAddressBalance
  ]);

  if (!connectedAccount) {
    return (
      <button onClick={connect} type="button">
        Connect Wallet
      </button>
    );
  }

  return (
    <>
      <div>Connected: {connectedAccount}</div>
      <div>
        Connected Account Balance:{' '}
        {isConnectedAccountBalanceLoading
          ? 'Loading...'
          : connectedAccountBalance
            ? `${
                Number(formatEther(connectedAccountBalance.value)).toFixed(3) ||
                '0.0'
              } ETH`
            : '0.0 ETH'}
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {stealthAddressDetails ? (
        <div>
          <div>Stealth Address: {stealthAddressDetails.stealthAddress}</div>
          <div>
            Stealth Address Balance:{' '}
            {isStealthAddressBalanceLoading
              ? 'Loading...'
              : stealthAddressBalance
                ? `${formatEther(stealthAddressBalance.value)} ETH`
                : '0.0 ETH'}
          </div>
        </div>
      ) : (
        <div>Please generate a stealth address</div>
      )}
      <button
        onClick={getStealthAddressDetails}
        disabled={currentStep !== 1}
        type="button"
      >
        Generate Stealth Address
      </button>
      <button
        onClick={sendToStealthAddress}
        disabled={currentStep !== 2 || isLoadingSendToStealthTx}
        type="button"
      >
        {isLoadingSendToStealthTx
          ? 'Sending...'
          : `Send ${SEND_AMOUNT} ETH to Stealth Address`}
      </button>
      {sendToStealthTxHash && (
        <p>Send Transaction Hash: {sendToStealthTxHash}</p>
      )}
      <button
        onClick={transferFromStealthAddress}
        disabled={currentStep !== 3 || isLoadingTransferFromStealthTx}
        type="button"
      >
        {isLoadingTransferFromStealthTx
          ? 'Transferring...'
          : `Transfer ${WITHDRAW_AMOUNT} ETH from Stealth Address to Connected Account`}
      </button>
      {transferFromStealthTxHash && (
        <p>Transfer Transaction Hash: {transferFromStealthTxHash}</p>
      )}
      {currentStep === 4 && <p>Transfer complete!</p>}
    </>
  );
};

export default StealthActionsExample;
