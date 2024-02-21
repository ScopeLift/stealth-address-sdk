import { createPublicClient, http, type PublicClient } from 'viem';
import { getChain } from '../helpers/chains';
import { actions as stealthActions } from '../actions';
import {
  PublicClientRequiredError,
  type ClientParams,
  type StealthClientInitParams,
  type StealthClientReturnType,
} from './types';

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

  const initializedActions: StealthClientReturnType = {
    getAnnouncements: params =>
      stealthActions.getAnnouncements({
        clientParams: { publicClient },
        ...params,
      }),
    getStealthMetaAddress: params =>
      stealthActions.getStealthMetaAddress({
        clientParams: { publicClient },
        ...params,
      }),
  };

  return initializedActions;
}

const handleViemPublicClient = (clientParams?: ClientParams): PublicClient => {
  let publicClient = clientParams?.publicClient;

  if (publicClient) {
    return publicClient;
  }

  if (!clientParams?.chainId || !clientParams?.rpcUrl) {
    throw new PublicClientRequiredError(
      'clientParams chainId and rpcUrl are required'
    );
  }

  try {
    return createPublicClient({
      chain: getChain(clientParams.chainId),
      transport: http(clientParams.rpcUrl),
    });
  } catch (error) {
    throw new PublicClientRequiredError('public client could not be created.');
  }
};

export { createStealthClient, handleViemPublicClient };
export default createStealthClient;
