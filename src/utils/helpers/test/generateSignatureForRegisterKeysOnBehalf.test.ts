import { beforeAll, describe, expect, test } from 'bun:test';
import type { WalletClient } from 'viem';
import { signMessage } from 'viem/actions';
import setupTestEnv from '../../../lib/helpers/test/setupTestEnv';
import setupTestWallet from '../../../lib/helpers/test/setupTestWallet';
import type { VALID_CHAIN_IDS } from '../../../lib/helpers/types';
import { VALID_SCHEME_ID } from '../../crypto';
import generateSignatureForRegisterKeysOnBehalf from '../generateSignatureForRegisterKeysOnBehalf';
import generateStealthMetaAddressFromSignature from '../generateStealthMetaAddressFromSignature';
import { GenerateSignatureForRegisterKeysError } from '../types';

describe('generateSignatureForRegisterKeysOnBehalf', () => {
  let params: Parameters<typeof generateSignatureForRegisterKeysOnBehalf>[0];
  let walletClient: WalletClient;

  beforeAll(async () => {
    walletClient = await setupTestWallet();
    const { ERC6538Address } = await setupTestEnv();
    const account = walletClient.account;
    const chainId = walletClient.chain?.id as VALID_CHAIN_IDS | undefined;
    if (!account) throw new Error('No account found');
    if (!chainId) throw new Error('No chain found');

    const signatureForStealthMetaAddress = await signMessage(walletClient, {
      account,
      message:
        'Sign this message to generate your stealth address keys.\nChain ID: 31337'
    });

    const stealthMetaAddressToRegister =
      generateStealthMetaAddressFromSignature(signatureForStealthMetaAddress);

    params = {
      walletClient,
      account: account.address,
      ERC6538Address,
      chainId,
      schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
      stealthMetaAddressToRegister
    };
  });

  test('should generate signature successfully', async () => {
    const result = await generateSignatureForRegisterKeysOnBehalf(params);
    expect(result).toBeTypeOf('string');
    expect(result.startsWith('0x')).toBe(true);
  });

  test('should throw GenerateSignatureForRegisterKeysError when contract read fails', async () => {
    const invalidParams = {
      ...params,
      ERC6538Address:
        '0x1234567890123456789012345678901234567890' as `0x${string}`
    };

    expect(
      generateSignatureForRegisterKeysOnBehalf(invalidParams)
    ).rejects.toBeInstanceOf(GenerateSignatureForRegisterKeysError);
  });

  test('should throw GenerateSignatureForRegisterKeysError when signing fails', async () => {
    // Create a wallet client that will fail on signTypedData
    const failingWalletClient = {
      ...walletClient,
      signTypedData: async () => {
        throw new Error('Signing failed');
      }
    } as WalletClient;

    const failingParams = {
      ...params,
      walletClient: failingWalletClient
    };

    expect(
      generateSignatureForRegisterKeysOnBehalf(failingParams)
    ).rejects.toBeInstanceOf(GenerateSignatureForRegisterKeysError);
  });
});
