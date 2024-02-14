import type {
  GetAnnouncementsParams,
  GetAnnouncementsReturnType,
  BlockType,
  AnnouncementLog,
} from './types';

import {
  createPublicClient,
  http,
  type PublicClient,
  parseAbiItem,
} from 'viem';
import { getBlock, getLogs } from 'viem/actions';
import { getChain } from '../helpers/chains';

async function getAnnouncements({
  clientParams,
  IERC5564Address,
  args,
  fromBlock,
  toBlock,
}: GetAnnouncementsParams): Promise<GetAnnouncementsReturnType> {
  let publicClient = clientParams?.publicClient;

  // Create a public client if one is not provided
  if (!publicClient) {
    if (!clientParams?.chainId || !clientParams.rpcUrl) {
      throw new Error('clientParams chainId and rpcUrl are required');
    }

    const { chainId, rpcUrl } = clientParams;
    publicClient = createPublicClient({
      chain: getChain(chainId),
      transport: http(rpcUrl),
    });
  }

  const fetchParams = {
    address: IERC5564Address,
    args,
  };

  const logs = await fetchLogsInChunks({
    publicClient,
    fetchParams,
    fromBlock,
    toBlock,
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
      ...log,
    };
  });

  return announcements;
}

const fetchLogsInChunks = async ({
  publicClient,
  fetchParams,
  fromBlock,
  toBlock,
  chunkSize = 1000, // Default chunk size, can be adjusted
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
      block: fromBlock ?? 'earliest',
    })) || BigInt(0);

  const resolvedToBlock = await resolveBlockNumber({
    publicClient,
    block: toBlock ?? 'latest',
  });

  if (!resolvedToBlock) {
    throw new Error('Failed to resolve toBlock');
  }

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
      toBlock: resolvedToBlock,
    });
    allLogs.push(...logs);
    currentBlock = endBlock + BigInt(1);
  }

  return allLogs;
};

async function resolveBlockNumber({
  publicClient,
  block,
}: {
  publicClient: PublicClient;
  block?: BlockType;
}) {
  if (typeof block === 'bigint') {
    return block;
  }

  try {
    const res = await getBlock(publicClient, { blockTag: block });
    return res.number;
  } catch (error) {
    throw new Error(`Failed to resolve block number: ${error}.`);
  }
}

export default getAnnouncements;
