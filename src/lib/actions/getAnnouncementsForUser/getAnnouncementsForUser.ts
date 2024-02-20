import type { PublicClient } from 'viem';
import {
  VALID_SCHEME_ID,
  checkStealthAddress,
  getViewTagFromMetadata,
} from '../../..';
import type {
  GetAnnouncementsForUserParams,
  GetAnnouncementsForUserReturnType,
} from './types';

async function getAnnouncementsForUser({
  announcements,
  spendingPublicKey,
  viewingPrivateKey,
  clientParams,
  excludeList = [],
  includeList = [],
}: GetAnnouncementsForUserParams): Promise<GetAnnouncementsForUserReturnType> {
  const relevantAnnouncements = announcements.filter(async announcement => {
    const {
      ephemeralPubKey: ephemeralPublicKey,
      metadata,
      stealthAddress: userStealthAddress,
      transactionHash: hash,
    } = announcement;

    const viewTag = getViewTagFromMetadata(metadata);

    // Check if the announcement is intended for the user
    const isForUser = checkStealthAddress({
      ephemeralPublicKey,
      schemeId: Number(announcement.schemeId) as VALID_SCHEME_ID, // TODO possibly refactor VALID_SCHEME_ID to BigInt
      spendingPublicKey,
      userStealthAddress,
      viewingPrivateKey,
      viewTag,
    });

    if (!isForUser) {
      return;
    }

    const from = await getTransactionFrom({
      hash,
      publicClient: clientParams?.publicClient,
    });

    // Skip if announcer is in excludeList
    if (excludeList.includes(from)) {
      return false;
    }

    // Only include if `from` is in includeList (if includeList is specified)
    if (includeList.length > 0 && !includeList.includes(from)) {
      return false;
    }
  });

  return relevantAnnouncements;
}

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

export default getAnnouncementsForUser;
