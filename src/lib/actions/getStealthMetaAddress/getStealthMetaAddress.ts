import { ERC6538RegistryAbi } from '../..';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import type {
  GetStealthMetaAddressParams,
  GetStealthMetaAddressReturnType,
} from './types';

// Registrant may be a 160 bit address or other recipient identifier, such as an ENS name.
async function getStealthMetaAddress({
  clientParams,
  ERC6538Address,
  registrant,
  schemeId,
}: GetStealthMetaAddressParams): Promise<GetStealthMetaAddressReturnType> {
  const publicClient = handleViemPublicClient(clientParams);
  try {
    return await publicClient.readContract({
      address: ERC6538Address,
      functionName: 'stealthMetaAddressOf',
      args: [registrant, BigInt(schemeId)],
      abi: ERC6538RegistryAbi,
    });
  } catch (error) {
    throw new Error(`Error getting stealth meta address: ${error}`);
  }
}

export default getStealthMetaAddress;
