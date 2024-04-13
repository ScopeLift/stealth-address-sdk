import { describe, expect, test } from 'bun:test';
import createStealthClient, {
  handleViemPublicClient,
} from './createStealthClient';
import { PublicClientRequiredError, type ClientParams } from './types';
import { createPublicClient, http } from 'viem';
import { foundry } from 'viem/chains';
import { LOCAL_ENDPOINT } from '../helpers/test/setupTestEnv';
import { type VALID_CHAIN_IDS } from '../helpers/types';

describe('createStealthClient', () => {
  test('throws error when invalid chain id is provided', () => {
    const invalidChainId = 9999;
    expect(() =>
      createStealthClient({
        chainId: invalidChainId as VALID_CHAIN_IDS, // Cast as valid chain to trigger error
        rpcUrl: LOCAL_ENDPOINT,
      }),
    ).toThrow(new Error('Invalid chainId: 9999'));
  });
});

describe('handleViemPublicClient', () => {
  test('throws error when clientParams is undefined', () => {
    expect(() => handleViemPublicClient(undefined)).toThrow(
      new PublicClientRequiredError(
        'publicClient or chainId and rpcUrl must be provided',
      ),
    );
  });
  test('returns publicClient when provided', () => {
    const mockPublicClient = createPublicClient({
      chain: foundry,
      transport: http(LOCAL_ENDPOINT),
    });
    const client = handleViemPublicClient({ publicClient: mockPublicClient });
    expect(client).toBe(mockPublicClient);
  });

  test('throws error when chainId is not set', () => {
    const exampleRpcUrl = 'https://example.com';
    expect(() =>
      handleViemPublicClient({
        chainId: undefined as unknown as VALID_CHAIN_IDS, // Cast as valid chain to trigger error
        rpcUrl: exampleRpcUrl,
      }),
    ).toThrow(
      new PublicClientRequiredError('public client could not be created.'),
    );
  });

  test('throws error when clientParams does not have publicClient or both chainId and rpcUrl', () => {
    // Example of incorrect structure: missing 'publicClient', 'chainId', and 'rpcUrl'
    // Intentionally cast as ClientParams to trigger error
    const incorrectParams = { someKey: 'someValue' } as unknown as ClientParams;

    // Attempting to call the function with incorrectParams should lead to the expected error
    expect(() => handleViemPublicClient(incorrectParams)).toThrow(
      new PublicClientRequiredError(
        'Either publicClient or both chainId and rpcUrl must be provided',
      ),
    );
  });
});
