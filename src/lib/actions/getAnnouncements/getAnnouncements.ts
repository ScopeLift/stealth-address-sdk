import type { BlockType } from '../types';

import { type PublicClient, parseAbiItem } from 'viem';
import { getBlock, getBlockNumber, getLogs } from 'viem/actions';
import { handleViemPublicClient } from '../../stealthClient/createStealthClient';
import type {
  AnnouncementLog,
  GetAnnouncementsParams,
  GetAnnouncementsReturnType
} from './types';

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

  const fetchParams = {
    address: ERC5564Address,
    args
  };

  const logs = await fetchLogsInChunks({
    publicClient,
    fetchParams,
    fromBlock,
    toBlock
  });

  // Extract the relevant data from the logs
  const announcements: AnnouncementLog[] = logs.map(log => {
    const { args } = log;

    return {
      schemeId: args.schemeId,
      stealthAddress: args.stealthAddress,
      caller: args.caller,
      ephemeralPubKey: args.ephemeralPubKey,
      metadata: args.metadata,
      ...log
    };
  });

  return announcements;
}

/**
 * Fetches logs in chunks to handle potential large range queries efficiently.
 *
 * @param {Object} params - The parameters for fetching logs in chunks.
 *   - `publicClient`: An instance of the viem `PublicClient`.
 *   - `fetchParams`: Parameters for the log fetch query.
 *   - `fromBlock`: The starting block number for the fetch.
 *   - `toBlock`: The ending block number for the fetch.
 *   - `chunkSize`: The number of blocks to query in each chunk.
 * @returns {Promise<GetLogsReturnType>} A flattened array of all logs fetched in chunks.
 */
const fetchLogsInChunks = async ({
  publicClient,
  fetchParams,
  fromBlock,
  toBlock,
  chunkSize = 5000 // Default chunk size, can be adjusted
}: {
  publicClient: PublicClient;
  fetchParams: {
    address: `0x${string}`;
    args: any;
    fromBlock?: BlockType;
    toBlock?: BlockType;
  };
  fromBlock?: BlockType;
  toBlock?: BlockType;
  chunkSize?: number;
}) => {
  const resolvedFromBlock =
    (await resolveBlockNumber({
      publicClient,
      block: fromBlock ?? 'earliest'
    })) || BigInt(0);

  const resolvedToBlock = await resolveBlockNumber({
    publicClient,
    block: toBlock ?? 'latest'
  });

  let currentBlock = resolvedFromBlock;
  const allLogs = [];

  while (currentBlock <= resolvedToBlock) {
    // Calculate the end block for the current chunk
    const endBlock =
      currentBlock + BigInt(chunkSize) < resolvedToBlock
        ? currentBlock + BigInt(chunkSize)
        : resolvedToBlock;

    const logs = await getLogs(publicClient, {
      ...fetchParams,
      event: parseAbiItem(
        'event Announcement(uint256 indexed schemeId,address indexed stealthAddress,address indexed caller,bytes ephemeralPubKey,bytes metadata)'
      ),
      fromBlock: currentBlock,
      toBlock: endBlock,
      strict: true
    });
    allLogs.push(...logs);
    currentBlock = endBlock + BigInt(1);
  }

  return allLogs;
};

/**
 * Resolves a block number from a given block type (number, tag, or bigint).
 *
 * @param {Object} params - Parameters for resolving the block number.
 *   - `publicClient`: An instance of the viem `PublicClient`.
 *   - `block`: The block number or tag to resolve.
 * @returns {Promise<bigint>} The resolved block number as a bigint or null.
 */
export async function resolveBlockNumber({
  publicClient,
  block
}: {
  publicClient: PublicClient;
  block?: BlockType;
}): Promise<bigint> {
  if (typeof block === 'bigint') {
    return block;
  }

  const { number } = await getBlock(publicClient, { blockTag: block });
  // Get the latest block number if null, since it is the pending block
  if (!number) {
    return getBlockNumber(publicClient);
  }
  return number;
}

export default getAnnouncements;
