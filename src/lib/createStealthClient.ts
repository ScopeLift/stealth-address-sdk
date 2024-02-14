import { createPublicClient, http } from 'viem'; // Assuming Viem provides this
import type {
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

export default createStealthClient;
