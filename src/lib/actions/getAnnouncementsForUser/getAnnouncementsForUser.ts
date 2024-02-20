import type { PublicClient } from 'viem';
import {
  checkStealthAddress,
  getViewTagFromMetadata,
  type EthAddress,
} from '../../..';
import {
  TransactionHashRequiredError,
  type GetAnnouncementsForUserParams,
  type GetAnnouncementsForUserReturnType,
  FromValueNotFoundError,
  type ProcessAnnouncementParams,
  type ProcessAnnouncementReturnType,
} from './types';
import type { AnnouncementLog } from '../getAnnouncements/types';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';

async function getAnnouncementsForUser({
  announcements,
  spendingPublicKey,
  viewingPrivateKey,
  clientParams,
  excludeList = [],
  includeList = [],
}: GetAnnouncementsForUserParams): Promise<GetAnnouncementsForUserReturnType> {
  const publicClient = handleViemPublicClient(clientParams);

  const processedAnnouncements = await Promise.allSettled(
    announcements.map(announcement =>
      processAnnouncement(announcement, publicClient, {
        spendingPublicKey,
        viewingPrivateKey,
        clientParams,
        excludeList,
        includeList,
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

async function processAnnouncement(
  announcement: AnnouncementLog,
  publicClient: PublicClient,
  {
    spendingPublicKey,
    viewingPrivateKey,
    excludeList = [],
    includeList = [],
  }: ProcessAnnouncementParams
): Promise<ProcessAnnouncementReturnType> {
  const {
    ephemeralPubKey: ephemeralPublicKey,
    metadata,
    stealthAddress: userStealthAddress,
    transactionHash: hash,
  } = announcement;

  const viewTag = getViewTagFromMetadata(metadata);

  const isForUser = checkStealthAddress({
    ephemeralPublicKey,
    spendingPublicKey,
    userStealthAddress,
    viewingPrivateKey,
    viewTag,
    schemeId: Number(announcement.schemeId),
  });

  // If the announcement is not intended for the user, return null
  if (!isForUser) return null;

  if (!hash) throw new TransactionHashRequiredError();

  const shouldInclude = await shouldIncludeAnnouncement({
    hash,
    excludeList,
    includeList,
    publicClient,
  });

  if (!shouldInclude) return null;

  // If all checks pass, return the original announcement
  return announcement;
}

// Helper function to determine if an announcement should be included
async function shouldIncludeAnnouncement({
  hash,
  excludeList,
  includeList,
  publicClient,
}: {
  hash: `0x${string}`;
  excludeList: EthAddress[];
  includeList: EthAddress[];
  publicClient: PublicClient;
}): Promise<boolean> {
  if (excludeList.length === 0 && includeList.length === 0) return true; // No filters applied, include announcement

  const from = await getTransactionFrom({ hash, publicClient });

  if (excludeList.includes(from)) return false; // Exclude if `from` is in excludeList

  if (includeList.length > 0 && !includeList.includes(from)) return false; // Exclude if `from` is not in includeList (when includeList is specified)

  return true; // Include if none of the above conditions apply
}

// Helper function to get the `from` value from a transaction
async function getTransactionFrom({
  publicClient,
  hash,
}: {
  publicClient: PublicClient;
  hash: `0x${string}`;
}) {
  try {
    const tx = await publicClient.getTransaction({ hash });
    return tx.from;
  } catch (error) {
    throw new FromValueNotFoundError();
  }
}

export default getAnnouncementsForUser;
