import type {
  WatchAnnouncementsForUserParams,
  WatchAnnouncementsForUserReturnType,
} from '..';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import { ERC5564AnnouncerAbi, getAnnouncementsForUser } from '../..';

/**
 * Watches for announcement events relevant to the user.
 *
 * @template T - The return type of the handleLogsForUser callback function.
 * @property {EthAddress} ERC5564Address - The Ethereum address of the ERC5564 contract.
 * @property {AnnouncementArgs} args - Arguments to filter the announcements.
 * @property {(logs: AnnouncementLog[]) => T} handleLogsForUser - Callback function to handle the filtered announcement logs.
 *   This function receives an array of AnnouncementLog and returns a generic value.
 * @property {WatchAnnouncementsForUserPollingOptions} [pollOptions] - Optional polling options to configure the behavior of watching announcements.
 *   This includes configurations such as polling frequency.
 * @property {Omit<GetAnnouncementsForUserParams, 'announcements'>} - Inherits all properties from GetAnnouncementsForUserParams except 'announcements'.
 *   This typically includes cryptographic keys and filter lists for inclusion or exclusion of specific announcements.
 */
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
}: WatchAnnouncementsForUserParams<T>): Promise<WatchAnnouncementsForUserReturnType> {
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
