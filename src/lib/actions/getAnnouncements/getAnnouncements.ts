import type { GetEventArgs } from 'viem';
import { ERC5564AnnouncerAbi } from '../../abi';
import { fetchLogsInChunks } from '../../helpers/logs';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import type {
  AnnouncementArgs,
  GetAnnouncementsParams,
  GetAnnouncementsReturnType
} from './types';

type AnnouncementFilter = GetEventArgs<
  typeof ERC5564AnnouncerAbi,
  'Announcement'
>;

/**
 * This function queries logs for the `Announcement` event emitted by the ERC5564 contract.
 *
 * @param {GetAnnouncementsParams} params - Parameters required for fetching announcements:
 *   - `clientParams`: Contains either an existing `PublicClient` instance or parameters to create one.
 *   - `ERC5564Address`: The address of the ERC5564 contract emitting the announcements.
 *   - `args`: Additional arguments to filter the logs, such as indexed parameters of the event.
 *   - `fromBlock`: The starting block number (or tag) for log fetching.
 *   - `toBlock`: The ending block number (or tag) for log fetching.
 * @returns {Promise<GetAnnouncementsReturnType>} An array of announcement logs matching the query.
 */
async function getAnnouncements({
  clientParams,
  ERC5564Address,
  args,
  fromBlock,
  toBlock
}: GetAnnouncementsParams): Promise<GetAnnouncementsReturnType> {
  const publicClient = handleViemPublicClient(clientParams);

  const logs = await fetchLogsInChunks({
    publicClient: publicClient,
    abi: ERC5564AnnouncerAbi,
    eventName: 'Announcement',
    address: ERC5564Address,
    args: convertAnnouncementArgs(args),
    fromBlock,
    toBlock
  });

  return logs.map(log => ({
    schemeId: log.args.schemeId,
    stealthAddress: log.args.stealthAddress,
    caller: log.args.caller,
    ephemeralPubKey: log.args.ephemeralPubKey,
    metadata: log.args.metadata,
    ...log
  }));
}

// Helper function to convert AnnouncementArgs to the array format Viem expects
function convertAnnouncementArgs(args: AnnouncementArgs) {
  return [
    args.schemeId === undefined ? undefined : args.schemeId,
    args.stealthAddress === undefined ? undefined : args.stealthAddress,
    args.caller === undefined ? undefined : args.caller
  ] as AnnouncementFilter;
}

export default getAnnouncements;
