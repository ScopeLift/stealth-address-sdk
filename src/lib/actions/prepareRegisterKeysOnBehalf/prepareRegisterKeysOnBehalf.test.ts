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

describe('prepareRegisterKeysOnBehalf', async () => {
  const { stealthClient, ERC6538Address, chainId } = setupTestEnv();
  const walletClient = setupTestWallet();
  const { stealthMetaAddressURI } = setupTestStealthKeys();
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
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
    const ERC6538REGISTRY_ENTRY_TYPE_HASH = await walletClient.readContract({
      address: ERC6538Address,
      abi: ERC6538RegistryAbi,
      functionName: 'ERC6538REGISTRY_ENTRY_TYPE_HASH',
    });

    // Prepare the signature types
    const types = {
      [primaryType]: [
        { name: 'ERC6538REGISTRY_ENTRY_TYPE_HASH', type: 'bytes32' },
        { name: 'schemeId', type: 'uint256' },
        { name: 'stealthMetaAddress', type: 'bytes' },
        { name: 'nonce', type: 'uint256' },
      ],
    } as const;

    const message = {
      ERC6538REGISTRY_ENTRY_TYPE_HASH,
      schemeId: BigInt(schemeId),
      stealthMetaAddress: stealthMetaAddressToRegister,
      nonce,
    };

    const signature = await walletClient.signTypedData({
      account: walletClient.account!, // Without this, no signer is available supposedly; TODO figure out why
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

  test('should successfully register a stealth meta-address on behalf using the prepare payload', () => {
    expect(res.status).toEqual('success');
  });
});
