import { beforeEach, mock, describe, test, expect, afterEach } from 'bun:test';
import { privateKeyToAccount } from 'viem/accounts';
import { ANVIL_DEFAULT_PRIVATE_KEY } from './setupTestWallet';
import { VALID_CHAINS } from '../types';

describe('setupTestWallet', async () => {
  const { setupTestWallet, getAccount } = await import('./setupTestWallet');

  // Clean up the environment variables before each test
  beforeEach(() => {
    delete process.env.USE_FORK;
    delete process.env.RPC_URL;
    delete process.env.PRIVATE_KEY;
  });

  afterEach(() => {
    delete process.env.USE_FORK;
    delete process.env.RPC_URL;
    delete process.env.PRIVATE_KEY;
  });

  test('uses PRIVATE_KEY environment variable when not using foundry', () => {
    const ANOTHER_ANVIL_PRIVATE_KEY =
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
    process.env.PRIVATE_KEY = ANOTHER_ANVIL_PRIVATE_KEY;
    const chainId = VALID_CHAINS[11155111].id;
    const account = getAccount(chainId);
    expect(account.address).toBeDefined();
    expect(account.address).not.toBe(
      privateKeyToAccount(ANVIL_DEFAULT_PRIVATE_KEY).address
    );
    delete process.env.PRIVATE_KEY;
  });

  test('throws an error when the PRIVATE_KEY environment variable is not set', async () => {
    // Set the fork env variables
    process.env.USE_FORK = 'true';
    process.env.RPC_URL = 'http://example-rpc-url.com';

    process.env.PRIVATE_KEY = undefined;
    const validChainId = VALID_CHAINS[11155111].id;

    // Mock the fetchJson function to return a valid chain ID
    mock.module('./setupTestEnv', () => ({
      fetchJson: () =>
        Promise.resolve({
          result: validChainId
        })
    }));

    expect(setupTestWallet()).rejects.toThrow(
      'Missing PRIVATE_KEY environment variable; make sure to set it when using a remote RPC URL.'
    );
  });
});
