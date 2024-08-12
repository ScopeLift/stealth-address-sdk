import {
  type PublicClient,
  type Abi,
  type AbiEvent,
  type GetEventArgs,
  type ExtractAbiItemNames,
  type DecodeEventLogReturnType,
  decodeEventLog,
  type ContractEventName
} from 'viem';
import type { BlockType } from '../actions/types';
import { getBlock, getBlockNumber, getLogs } from 'viem/actions';

type FetchLogsInChunksParams<TAbi extends Abi> = {
  publicClient: PublicClient;
  abi: TAbi;
  eventName: ContractEventName<TAbi>;
  fetchParams: {
    address: `0x${string}`;
    args?: GetEventArgs<TAbi, ContractEventName<TAbi>>;
  };
  fromBlock?: BlockType;
  toBlock?: BlockType;
  chunkSize?: number;
};

function isAbiEvent(item: unknown): item is AbiEvent {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'event' &&
    'name' in item
  );
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
export const fetchLogsInChunks = async <
  TAbi extends Abi,
  TEventName extends ExtractAbiItemNames<TAbi>
>({
  publicClient,
  abi,
  eventName,
  fetchParams,
  fromBlock,
  toBlock,
  chunkSize = 5000
}: FetchLogsInChunksParams<TAbi>) => {
  const resolvedFromBlock =
    (await resolveBlockNumber({
      publicClient,
      block: fromBlock ?? 'earliest'
    })) || BigInt(0);

  const resolvedToBlock = await resolveBlockNumber({
    publicClient,
    block: toBlock ?? 'latest'
  });

  const eventAbi = abi.find(
    (item): item is AbiEvent => isAbiEvent(item) && item.name === eventName
  );

  if (!eventAbi) {
    throw new Error(`Event ${eventName} not found in the provided ABI`);
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
      address: fetchParams.address,
      event: eventAbi,
      args: fetchParams.args,
      fromBlock: currentBlock,
      toBlock: endBlock,
      strict: true
    });

    const decodedLogs = logs.map(log => ({
      ...log,
      ...(decodeEventLog({
        abi,
        eventName,
        topics: log.topics,
        data: log.data
      }) as DecodeEventLogReturnType<TAbi, ContractEventName<TAbi>>)
    }));

    allLogs.push(...decodedLogs);

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
