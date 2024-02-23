import type { WatchAnnouncementsForUserParams } from '..';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import { ERC5564AnnouncerAbi } from '../..';

async function watchAnnouncementsForUser<T = void>({
  clientParams,
  ERC5564Address,
  args,
  handleLogs,
}: WatchAnnouncementsForUserParams<T>) {
  const publicClient = handleViemPublicClient(clientParams);

  const unwatch = publicClient.watchContractEvent({
    address: ERC5564Address,
    abi: ERC5564AnnouncerAbi,
    eventName: 'Announcement',
    args,
    onLogs: handleLogs,
    strict: true,
  });

  return unwatch;
}

export default watchAnnouncementsForUser;
