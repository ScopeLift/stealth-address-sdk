import type {
  PrepareRegisterKeysOnBehalfParams,
  PrepareRegisterKeysOnBehalfReturnType
} from './types';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import { ERC6538RegistryAbi } from '../..';
import { encodeFunctionData } from 'viem';
import { PrepareError } from '../types';

async function prepareRegisterKeysOnBehalf({
  ERC6538Address,
  args,
  account,
  clientParams
}: PrepareRegisterKeysOnBehalfParams): Promise<PrepareRegisterKeysOnBehalfReturnType> {
  const publicClient = handleViemPublicClient(clientParams);
  const { registrant, schemeId, stealthMetaAddress, signature } = args;
  const writeArgs: [`0x${string}`, bigint, `0x${string}`, `0x${string}`] = [
    registrant,
    BigInt(schemeId),
    signature,
    stealthMetaAddress
  ];

  const data = encodeFunctionData({
    abi: ERC6538RegistryAbi,
    functionName: 'registerKeysOnBehalf',
    args: writeArgs
  });

  try {
    await publicClient.simulateContract({
      account,
      address: ERC6538Address,
      abi: ERC6538RegistryAbi,
      functionName: 'registerKeysOnBehalf',
      args: writeArgs
    });

    return {
      to: ERC6538Address,
      account,
      data
    };
  } catch (error) {
    throw new PrepareError(`Failed to prepare contract call: ${error}`);
  }
}

export default prepareRegisterKeysOnBehalf;
