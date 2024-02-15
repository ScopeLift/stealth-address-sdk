import { createPublicClient, http, type PublicClient } from 'viem';
import type {
  ClientParams,
  InitializedStealthActions,
  StealthClientInitParams,
  StealthClientReturnType,
} from './actions/types';
import { getChain } from './helpers/chains';
import * as stealthActions from './actions';

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
