import type { PublicClient } from 'viem';
import {
  VALID_SCHEME_ID,
  checkStealthAddress,
  getViewTagFromMetadata,
  type EthAddress,
} from '../../..';
import type {
  GetAnnouncementsForUserParams,
  GetAnnouncementsForUserReturnType,
} from './types';
import type { AnnouncementLog } from '../getAnnouncements/types';

async function getAnnouncementsForUser({
  announcements,
  spendingPublicKey,
  viewingPrivateKey,
  clientParams,
  excludeList = [],
  includeList = [],
}: GetAnnouncementsForUserParams): Promise<GetAnnouncementsForUserReturnType> {
  const relevantAnnouncements = await Promise.all(
    announcements.map(async announcement => {
      const {
        ephemeralPubKey: ephemeralPublicKey,
        metadata,
        stealthAddress: userStealthAddress,
        transactionHash: hash,
      } = announcement;

      const viewTag = getViewTagFromMetadata(metadata);
      const isForUser = checkStealthAddress({
        ephemeralPublicKey,
        schemeId: Number(announcement.schemeId) as VALID_SCHEME_ID, // TODO refactor to bigint
        spendingPublicKey,
        userStealthAddress,
        viewingPrivateKey,
        viewTag,
      });

      if (!isForUser) return null;

      // Handle excludeList and includeList
      const includeAnnouncement = await shouldIncludeAnnouncement({
        hash,
        excludeList,
        includeList,
        publicClient: clientParams?.publicClient,
      });

      return includeAnnouncement ? announcement : null;
    })
  );

  return relevantAnnouncements.filter(
    (announcement): announcement is AnnouncementLog => announcement !== null
  );
}

// Helper function to get the `from` value from a transaction
async function getTransactionFrom({
  publicClient,
  hash,
}: {
  publicClient: PublicClient | undefined;
  hash: `0x${string}` | null;
}) {
  if (!hash) throw new Error('No hash provided');
  if (!publicClient) throw new Error('No publicClient provided');

  try {
    const tx = await publicClient.getTransaction({ hash });
    return tx.from;
  } catch (error) {
    throw new Error(`Error fetching transaction from value: ${error}`);
  }
}

// Helper function to determine if an announcement should be included
async function shouldIncludeAnnouncement({
  hash,
  excludeList,
  includeList,
  publicClient,
}: {
  hash: `0x${string}` | null;
  excludeList: EthAddress[];
  includeList: EthAddress[];
  publicClient: PublicClient | undefined;
}): Promise<boolean> {
  if (excludeList.length === 0 && includeList.length === 0) {
    return true; // No filters applied, include announcement
  }

  const from = await getTransactionFrom({ hash, publicClient });
  if (excludeList.includes(from)) {
    return false; // Exclude if `from` is in excludeList
  }
  if (includeList.length > 0 && !includeList.includes(from)) {
    return false; // Exclude if `from` is not in includeList (when includeList is specified)
  }
  return true; // Include if none of the above conditions apply
}

export default getAnnouncementsForUser;
