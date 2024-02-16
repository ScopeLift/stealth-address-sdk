import { ERC6538RegistryAbi } from '../..';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import type {
  GetStealthMetaAddressParams,
  GetStealthMetaAddressReturnType,
} from './types';

/**
 * Retrieves a stealth meta address from the ERC-6538 Registry contract.
 *
 * The `registrant` parameter can represent different types of recipient identifiers,
 * including a standard Ethereum address (160-bit) or other formats like ENS names.
 *
 * @param {GetStealthMetaAddressParams} params - The parameters for fetching the stealth meta address.
 *   - `clientParams`: (Optional if stealthClient is set up) Client parameters for stealthClient initialization.
 *   - `ERC6538Address`: The address of the ERC-6538 Registry contract.
 *   - `registrant`: The registrant identifier (Ethereum address or ENS name).
 *   - `schemeId`: The ID of the stealth address scheme to use.
 * @returns {Promise<GetStealthMetaAddressReturnType>} The stealth meta address.
 *
 * @throws {Error} If there is an error fetching the stealth meta address from the contract.
 */
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
