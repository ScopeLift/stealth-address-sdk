import { encodeFunctionData } from 'viem';
import { ERC6538RegistryAbi } from '../..';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import { PrepareError } from '../types';
import type {
  PrepareRegisterKeysParams,
  PrepareRegisterKeysReturnType
} from './types';

/**
 * Prepares the payload for registering keys (setting the stealth meta-address) by simulating the contract call.
 * This function generates the necessary payload for signing and sending a transaction.
 *
 * @param {PrepareRegisterKeysParams} params - Parameters for preparing the key registration.
 * @property {EthAddress} ERC6538Address - The Ethereum address of the ERC6538 contract.
 * @property {VALID_SCHEME_ID} schemeId - The scheme ID as per the ERC6538 specification.
 * @property {`0x${string}`} stealthMetaAddress - The stealth meta-address to be registered.
 * @property {`0x${string}`} account - The address of the account.
 * @property {ClientParams} [clientParams] - Optional client parameters for direct function usage.
 *
 * @returns {Promise<PrepareRegisterKeysReturnType>} - Returns a promise that resolves to the prepared key registration payload.
 *
 * @throws {PrepareError} - Throws a PrepareError if the contract call simulation fails.
 */
async function prepareRegisterKeys({
  ERC6538Address,
  schemeId,
  stealthMetaAddress,
  account,
  clientParams
}: PrepareRegisterKeysParams): Promise<PrepareRegisterKeysReturnType> {
  const publicClient = handleViemPublicClient(clientParams);
  const args: [bigint, `0x${string}`] = [BigInt(schemeId), stealthMetaAddress];

  const data = encodeFunctionData({
    abi: ERC6538RegistryAbi,
    functionName: 'registerKeys',
    args
  });

  // Simulate the contract call
  try {
    await publicClient.simulateContract({
      account,
      address: ERC6538Address,
      abi: ERC6538RegistryAbi,
      functionName: 'registerKeys',
      args
    });
  } catch (error) {
    throw new PrepareError(`Failed to prepare contract call: ${error}`);
  }

  return {
    to: ERC6538Address,
    account,
    data
  };
}

export default prepareRegisterKeys;
