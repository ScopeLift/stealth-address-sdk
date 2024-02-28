import type { PrepareAnnounceParams, PrepareAnnounceReturnType } from './types';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import { ERC5564AnnouncerAbi } from '../..';
import { encodeFunctionData } from 'viem';
import { PrepareError } from '../types';

/**
 * Prepares the payload for announcing a stealth address to the ERC5564 contract.
 * It simulates the contract call to generate the necessary payload without actually sending a transaction.
 * This payload can then be used for signing and sending a transaction.
 *
 * @param {PrepareAnnounceParams} params The parameters required to prepare the announcement.
 * @property {EthAddress} ERC5564Address The address of the ERC5564 contract.
 * @property {AnnounceArgs} args The announcement details, including:
 *  - {VALID_SCHEME_ID} schemeId The scheme id per ERC5564.
 *  - {`0x${string}`} stealthAddress The stealth address being announced.
 *  - {`0x${string}`} ephemeralPublicKey The ephemeral public key for this announcement.
 *  - {`0x${string}`} metadata Additional metadata for the announcement including the view tag.
 * @property {`0x${string}`} account The address of the account making the announcement.
 * @property {ClientParams} clientParams Optional client parameters for direct function use.
 * @returns {Promise<PrepareAnnounceReturnType>} The prepared announcement payload, including the transaction data.
 */
async function prepareAnnounce({
  ERC5564Address,
  args,
  account,
  clientParams,
}: PrepareAnnounceParams): Promise<PrepareAnnounceReturnType> {
  const publicClient = handleViemPublicClient(clientParams);
  const { schemeId, stealthAddress, ephemeralPublicKey, metadata } = args;
  const schemeIdBigInt = BigInt(schemeId);
  const writeArgs: [bigint, `0x${string}`, `0x${string}`, `0x${string}`] = [
    schemeIdBigInt,
    stealthAddress,
    ephemeralPublicKey,
    metadata,
  ];

  const data = encodeFunctionData({
    abi: ERC5564AnnouncerAbi,
    functionName: 'announce',
    args: writeArgs,
  });

  let to, from;

  try {
    const {
      request: {
        address: contractAddress,
        account: { address },
      },
    } = await publicClient.simulateContract({
      account,
      address: ERC5564Address,
      abi: ERC5564AnnouncerAbi,
      functionName: 'announce',
      args: writeArgs,
    });

    to = contractAddress;
    from = address;
  } catch (error) {
    throw new PrepareError(`Failed to prepare contract call: ${error}`);
  }

  return {
    to,
    account,
    data,
  };
}
export default prepareAnnounce;
