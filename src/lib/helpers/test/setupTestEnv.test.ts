import { jest, describe, expect, test, mock, beforeEach } from 'bun:test';
import { LOCAL_ENDPOINT } from './setupTestEnv';
import { VALID_CHAINS } from '../types';

describe('setupTestEnv with different environment configurations', () => {
  test('should use local node endpoint url when USE_FORK is true and RPC_URL is defined', async () => {
    const exampleRpcUrl = 'http://example-rpc-url.com';
    process.env.USE_FORK = 'true';
    process.env.RPC_URL = exampleRpcUrl;
    const { getRpcUrl } = await import('./setupTestEnv');

    expect(getRpcUrl()).toBe(LOCAL_ENDPOINT);
  });

  test('throws error when USE_FORK is true and RPC_URL is not defined', async () => {
    process.env.USE_FORK = 'true';
    delete process.env.RPC_URL;
    const { getRpcUrl } = await import('./setupTestEnv');

    expect(getRpcUrl).toThrow('RPC_URL not defined in env');
  });

  test('should use local node endpoint when USE_FORK is not true', async () => {
    process.env.USE_FORK = 'false';
    const { getRpcUrl } = await import('./setupTestEnv');

    expect(getRpcUrl()).toBe(LOCAL_ENDPOINT);
  });

  test('should use the default foundry local endpoint when USE_FORK is not defined', async () => {
    process.env.USE_FORK = undefined;
    const { getRpcUrl } = await import('./setupTestEnv');

    expect(getRpcUrl()).toBe(LOCAL_ENDPOINT);
  });
});

describe('getValidChainId validation', () => {
  const { getValidChainId } = require('./setupTestEnv');

  test('valid chain ID returns correctly', () => {
    const validChain = VALID_CHAINS[11155111];

    expect(getValidChainId(validChain.id)).toBe(validChain.id);
  });

  test('invalid chain ID throws error', () => {
    const invalidChainId = 9999;
    expect(() => getValidChainId(invalidChainId)).toThrow(
      `Invalid chain ID: ${invalidChainId}`
    );
  });
});

describe('fetchChainId', async () => {
  const { fetchChainId } = await import('./setupTestEnv');

  beforeEach(() => {
    // Set the env vars, which are needed to use a fork and not default to using foundry chain id
    process.env.USE_FORK = 'true';
    process.env.RPC_URL = 'http://example-rpc-url.com';
  });

  test('successful fetch returns chain ID', async () => {
    mock.module('./setupTestEnv', () => ({
      fetchJson: () =>
        Promise.resolve({
          result: '0x1',
        }),
    }));

    const chainId = await fetchChainId();
    expect(chainId).toBe(1); // '0x1' translates to 1
  });

  test('fetch failure throws error', async () => {
    mock.module('./setupTestEnv', () => ({
      fetchJson: () => Promise.reject(new Error('Network failure')),
    }));

    expect(fetchChainId()).rejects.toThrow('Failed to get the chain ID');
  });

  test('throws error when RPC_URL is not defined', async () => {
    delete process.env.RPC_URL;

    expect(fetchChainId).toThrow('RPC_URL not defined in env');
  });
});
