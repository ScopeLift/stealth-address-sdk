import { type PublicClient, getAddress } from 'viem';
import {
  type EthAddress,
  checkStealthAddress,
  getViewTagFromMetadata
} from '../../..';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import type { AnnouncementLog } from '../getAnnouncements/types';
import {
  FromValueNotFoundError,
  type GetAnnouncementsForUserParams,
  type GetAnnouncementsForUserReturnType,
  type ProcessAnnouncementParams,
  type ProcessAnnouncementReturnType,
  TransactionHashRequiredError
} from './types';

/**
 * @description Fetches and processes a list of announcements to determine which are relevant for the user.
 * Filters announcements based on the `checkStealthAddress` function and optional exclude/include lists,
 *
 * @param {GetAnnouncementsForUserParams} params Parameters for fetching and filtering announcements, including:
 * - `announcements`: Array of announcement logs to be processed.
 * - `spendingPublicKey`: The user's spending public key.
 * - `viewingPrivateKey`: The user's viewing private key.
 * - `clientParams`:(Optional) Client parameters.
 * - `excludeList`: (Optional) Addresses to exclude from the results.
 * - `includeList`: (Optional) Addresses to specifically include in the results.
 * @returns {Promise<GetAnnouncementsForUserReturnType>} A promise that resolves to an array of announcements relevant to the user.
 */
async function getAnnouncementsForUser({
  announcements,
  spendingPublicKey,
  viewingPrivateKey,
  clientParams,
  excludeList = [],
  includeList = []
}: GetAnnouncementsForUserParams): Promise<GetAnnouncementsForUserReturnType> {
  const publicClient = handleViemPublicClient(clientParams);

  // Validate excludeList and includeList
  const _excludeList = new Set(
    [...new Set(excludeList).values()].map(address => getAddress(address))
  );
  const _includeList = new Set(
    [...new Set(includeList).values()].map(address => getAddress(address))
  );

  const processedAnnouncements = await Promise.allSettled(
    announcements.map(announcement =>
      processAnnouncement(announcement, publicClient, {
        spendingPublicKey,
        viewingPrivateKey,
        clientParams,
        excludeList: _excludeList,
        includeList: _includeList
      })
    )
  );

  const relevantAnnouncements = processedAnnouncements.reduce<
    AnnouncementLog[]
  >(
    (acc, result) =>
      result.status === 'fulfilled' && result.value !== null
        ? [...acc, result.value]
        : acc,
    []
  );

  return relevantAnnouncements;
}

/**
 * @description Processes a single announcement to determine if it is relevant for the user.
 * Checks if the announcement is intended for the user based on `checkStealthAddress` and filters based on exclude/include lists.
 *
 * @param {AnnouncementLog} announcement The announcement to process.
 * @param {PublicClient} publicClient The Viem public client for fetching transaction details.
 * @param {ProcessAnnouncementParams} params Additional parameters for processing, including:
 * - `spendingPublicKey`: The user's spending public key.
 * - `viewingPrivateKey`: The user's viewing private key.
 * - `excludeList`: Addresses to exclude from the results.
 * - `includeList`: Addresses to specifically include in the results.
 * @returns {Promise<ProcessAnnouncementReturnType>} A promise that resolves to the processed announcement if it is relevant, or null otherwise.
 */
export async function processAnnouncement(
  announcement: AnnouncementLog,
  publicClient: PublicClient,
  {
    spendingPublicKey,
    viewingPrivateKey,
    excludeList,
    includeList
  }: ProcessAnnouncementParams
): Promise<ProcessAnnouncementReturnType> {
  const {
    ephemeralPubKey: ephemeralPublicKey,
    metadata,
    stealthAddress: userStealthAddress,
    transactionHash: hash
  } = announcement;

  const viewTag = getViewTagFromMetadata(metadata);

  const isForUser = checkStealthAddress({
    ephemeralPublicKey,
    spendingPublicKey,
    userStealthAddress,
    viewingPrivateKey,
    viewTag,
    schemeId: Number(announcement.schemeId)
  });

  // If the announcement is not intended for the user, return null
  if (!isForUser) return null;

  if (!hash) throw new TransactionHashRequiredError();

  const shouldInclude = await shouldIncludeAnnouncement({
    hash,
    excludeList,
    includeList,
    publicClient
  });

  if (!shouldInclude) return null;

  // If all checks pass, return the original announcement
  return announcement;
}

/**
 * @description Determines if an announcement should be included based on exclude and include lists.
 * Fetches the transaction sender and checks against the provided lists for filtering.
 *
 * @param {Object} params The parameters for the inclusion check, including:
 * - `hash`: The transaction hash of the announcement.
 * - `excludeList`: A Set of addresses to exclude from the results.
 * - `includeList`: A Set of addresses to specifically include in the results.
 * - `publicClient`: The Viem public client for fetching transaction details.
 * @returns {Promise<boolean>} A promise that resolves to true if the announcement should be included, false otherwise.
 */
async function shouldIncludeAnnouncement({
  hash,
  excludeList,
  includeList,
  publicClient
}: {
  hash: `0x${string}`;
  excludeList: Set<EthAddress>;
  includeList: Set<EthAddress>;
  publicClient: PublicClient;
}): Promise<boolean> {
  if (excludeList.size === 0 && includeList.size === 0) return true; // No filters applied, include announcement

  const from = await getTransactionFrom({ hash, publicClient });

  if (excludeList.has(from)) return false; // Exclude if `from` is in excludeList

  if (includeList.size > 0 && !includeList.has(from)) return false; // Exclude if `from` is not in includeList (when includeList is specified)

  return true; // Include if none of the above conditions apply
}

/**
 * @description Fetches the transaction sender ('from' address) for a given transaction hash.
 * Utilized for filtering announcements based on exclude/include lists by identifying the sender of each announcement.
 *
 * @param {Object} params The parameters for fetching the transaction sender, including:
 * - `publicClient`: The Viem public client used for the transaction fetch.
 * - `hash`: The transaction hash to fetch the 'from' address for.
 * @returns {Promise<`0x${string}`>} A promise that resolves to the transaction sender address.
 * @throws {FromValueNotFoundError} If the transaction or sender address cannot be fetched, indicating a potential issue with the transaction lookup.
 */
export async function getTransactionFrom({
  publicClient,
  hash
}: {
  publicClient: PublicClient;
  hash: `0x${string}`;
}): Promise<`0x${string}`> {
  try {
    const tx = await publicClient.getTransaction({ hash });
    return getAddress(tx.from);
  } catch (error) {
    throw new FromValueNotFoundError();
  }
}

export default getAnnouncementsForUser;
