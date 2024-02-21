import { createPublicClient, http, type PublicClient } from 'viem';
import type {
  ClientParams,
  StealthClientInitParams,
  StealthClientReturnType,
} from './actions/types';
import { getChain } from './helpers/chains';
import * as stealthActions from './actions';

/**
 * Creates a client for use in stealth address operations that align with ERC5564.
 *
 * @param {StealthClientInitParams} params - Parameters for initializing the stealth client, including chain ID and RPC URL.
 * @returns {StealthClientReturnType} - An object containing initialized stealth action functions.
 *
 * @example
 * import { createStealthClient } from 'stealth-address-sdk'
 *
 * const stealthClient = createStealthClient({
 *   chainId,
 *   rpcUrl,
 * })
 *
 * stealthClient.getAnnouncements({ params })
 */
function createStealthClient({
  chainId,
  rpcUrl,
}: StealthClientInitParams): StealthClientReturnType {
  const chain = getChain(chainId);

  if (!chain) {
    throw new Error(`Invalid chainId: ${chainId}`);
  }

  // Init viem client
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const isKeyOfStealthActions = (
    key: string
  ): key is keyof StealthClientReturnType => key in stealthActions;

  // Initialize actions with the publicClient
  return Object.keys(stealthActions).reduce((acc, actionName) => {
    const key = actionName;

    if (isKeyOfStealthActions(key)) {
      const action = stealthActions[key];
      acc[key] = (...args: Parameters<typeof action>) =>
        action({ clientParams: { publicClient }, ...args[0] });
    }

    return acc;
  }, {} as StealthClientReturnType);
}

const handleViemPublicClient = (clientParams?: ClientParams): PublicClient => {
  let publicClient = clientParams?.publicClient;

  if (publicClient) {
    return publicClient;
  }

  if (!clientParams?.chainId || !clientParams?.rpcUrl) {
    throw new Error('clientParams chainId and rpcUrl are required');
  }

  return createPublicClient({
    chain: getChain(clientParams.chainId),
    transport: http(clientParams.rpcUrl),
  });
};

export { createStealthClient, handleViemPublicClient };
export default createStealthClient;
