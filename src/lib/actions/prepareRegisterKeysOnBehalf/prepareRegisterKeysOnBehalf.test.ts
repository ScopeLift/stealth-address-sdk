import { describe, test, expect } from 'bun:test';
import setupTestEnv from '../../helpers/test/setupTestEnv';
import setupTestWallet from '../../helpers/test/setupTestWallet';
import {
  ERC6538RegistryAbi,
  VALID_SCHEME_ID,
  parseStealthMetaAddressURI,
} from '../../..';
import setupTestStealthKeys from '../../helpers/test/setupTestStealthKeys';
import type { RegisterKeysOnBehalfArgs } from './types';
import { PrepareError } from '../types';

describe('prepareRegisterKeysOnBehalf', async () => {
  const { stealthClient, ERC6538Address, chainId } = await setupTestEnv();
  const walletClient = await setupTestWallet();
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddressURI } = setupTestStealthKeys(schemeId);
  const stealthMetaAddressToRegister = parseStealthMetaAddressURI({
    stealthMetaAddressURI,
    schemeId,
  });
  const account = walletClient.account?.address!;

  const generateSignature = async () => {
    // Get the registrant's current nonce for the signature
    const nonce = await walletClient.readContract({
      address: ERC6538Address,
      abi: ERC6538RegistryAbi,
      functionName: 'nonceOf',
      args: [account],
    });

    // Prepare the signature domain
    const domain = {
      name: 'ERC6538Registry',
      version: '1.0',
      chainId,
      verifyingContract: ERC6538Address,
    } as const;

    // Taken from the ERC6538Registry contract
    const primaryType = 'Erc6538RegistryEntry';

    // Prepare the signature types
    const types = {
      [primaryType]: [
        { name: 'schemeId', type: 'uint256' },
        { name: 'stealthMetaAddress', type: 'bytes' },
        { name: 'nonce', type: 'uint256' },
      ],
    } as const;

    const message = {
      schemeId: BigInt(schemeId),
      stealthMetaAddress: stealthMetaAddressToRegister,
      nonce,
    };

    const signature = await walletClient.signTypedData({
      account: walletClient.account!,
      primaryType,
      domain,
      types,
      message,
    });

    return signature;
  };

  const args: RegisterKeysOnBehalfArgs = {
    registrant: account,
    schemeId,
    stealthMetaAddress: stealthMetaAddressToRegister,
    signature: await generateSignature(),
  };

  const prepared = await stealthClient.prepareRegisterKeysOnBehalf({
    account,
    ERC6538Address,
    args,
  });

  // Prepare tx using viem and the prepared payload
  const request = await walletClient.prepareTransactionRequest({
    ...prepared,
    chain: walletClient.chain,
    account: walletClient.account,
  });

  const hash = await walletClient.sendTransaction({
    ...request,
    chain: walletClient.chain,
  });

  const res = await walletClient.waitForTransactionReceipt({ hash });

  test('should throw PrepareError when given invalid contract address', () => {
    const invalidERC6538Address = '0xinvalid';
    expect(
      stealthClient.prepareRegisterKeysOnBehalf({
        account,
        ERC6538Address: invalidERC6538Address,
        args,
      })
    ).rejects.toBeInstanceOf(PrepareError);
  });

  test('should successfully register a stealth meta-address on behalf using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
