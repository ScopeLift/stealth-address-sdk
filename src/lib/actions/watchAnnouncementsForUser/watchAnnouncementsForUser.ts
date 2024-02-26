import type { WatchAnnouncementsForUserParams } from '..';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import { ERC5564AnnouncerAbi, getAnnouncementsForUser } from '../..';

async function watchAnnouncementsForUser<T = void>({
  args,
  spendingPublicKey,
  viewingPrivateKey,
  ERC5564Address,
  clientParams,
  excludeList,
  includeList,
  handleLogsForUser,
  pollOptions,
}: WatchAnnouncementsForUserParams<T>) {
  const publicClient = handleViemPublicClient(clientParams);

  const unwatch = publicClient.watchContractEvent({
    address: ERC5564Address,
    abi: ERC5564AnnouncerAbi,
    eventName: 'Announcement',
    args,
    onLogs: async logs => {
      const announcements = logs.map(log => ({
        ...log,
        caller: log.args.caller,
        ephemeralPubKey: log.args.ephemeralPubKey,
        metadata: log.args.metadata,
        schemeId: log.args.schemeId,
        stealthAddress: log.args.stealthAddress,
      }));

      const relevantAnnouncements = await getAnnouncementsForUser({
        announcements,
        spendingPublicKey,
        viewingPrivateKey,
        clientParams: { publicClient },
        excludeList,
        includeList,
      });

      handleLogsForUser(relevantAnnouncements);
    },
    strict: true,
    ...pollOptions,
  });

  return unwatch;
}

export default watchAnnouncementsForUser;
