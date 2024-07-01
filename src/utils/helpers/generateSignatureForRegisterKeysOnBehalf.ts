import { readContract } from 'viem/actions';
import { ERC6538RegistryAbi } from '../../lib';
import {
  GenerateSignatureForRegisterKeysError,
  type GenerateSignatureForRegisterKeysParams
} from './types';

const DOMAIN_NAME = 'ERC6538Registry';
const DOMAIN_VERSION = '1.0';
const PRIMARY_TYPE = 'Erc6538RegistryEntry';

const SIGNATURE_TYPES = {
  [PRIMARY_TYPE]: [
    { name: 'schemeId', type: 'uint256' },
    { name: 'stealthMetaAddress', type: 'bytes' },
    { name: 'nonce', type: 'uint256' }
  ]
} as const;

/**
 * Generates a typed signature for registering keys on behalf of a user in the ERC6538 Registry.
 *
 * This function creates an EIP-712 compliant signature for the `registerKeysOnBehalf` function
 * in the ERC6538 Registry contract. It retrieves the current nonce for the account, prepares
 * the domain separator and message, and signs the data using the provided Viem wallet client.
 *
 * @param {GenerateSignatureForRegisterKeysParams} params - The parameters for generating the signature.
 * @returns {Promise<`0x${string}`>} A promise that resolves to the generated signature as a hexadecimal string.
 *
 * @throws {GenerateSignatureForRegisterKeysError} If the contract read fails or if the signing process encounters an issue.
 *
 * @example
 * const signature = await generateSignatureForRegisterKeysOnBehalf({
 *   walletClient,
 *   account: '0x1234...5678',
 *   ERC6538Address: '0xabcd...ef01',
 *   chainId: 1,
 *   schemeId: 1,
 *   stealthMetaAddressToRegister: '0x9876...5432'
 * });
 */
async function generateSignatureForRegisterKeysOnBehalf({
  walletClient,
  account,
  ERC6538Address,
  chainId,
  schemeId,
  stealthMetaAddressToRegister
}: GenerateSignatureForRegisterKeysParams): Promise<`0x${string}`> {
  try {
    // Get the registrant's current nonce for the signature
    const nonce = await readContract(walletClient, {
      address: ERC6538Address,
      abi: ERC6538RegistryAbi,
      functionName: 'nonceOf',
      args: [account]
    });

    // Prepare the signature domain
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: ERC6538Address
    } as const;

    const message = {
      schemeId: BigInt(schemeId),
      stealthMetaAddress: stealthMetaAddressToRegister,
      nonce
    };

    const signature = await walletClient.signTypedData({
      account,
      primaryType: PRIMARY_TYPE,
      domain,
      types: SIGNATURE_TYPES,
      message
    });

    return signature;
  } catch (error) {
    console.error('Error generating signature:', error);
    throw new GenerateSignatureForRegisterKeysError(
      'Failed to generate signature for registerKeysOnBehalf',
      error
    );
  }
}

export default generateSignatureForRegisterKeysOnBehalf;
