import { createPublicClient, http, type PublicClient } from 'viem';
import type {
  ClientParams,
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

  const initializedActions = Object.keys(stealthActions).reduce(
    (acc, actionName) => {
      const action = (stealthActions as any)[actionName];
      if (typeof action === 'function') {
        (acc as any)[actionName] = action.bind(null, { publicClient });
      }
      return acc;
    },
    {} as StealthClientReturnType
  );

  return initializedActions;
}

const handleViemPublicClient = (clientParams: ClientParams): PublicClient => {
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
