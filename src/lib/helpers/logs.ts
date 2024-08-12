import {
  type PublicClient,
  type Abi,
  type AbiEvent,
  type GetEventArgs,
  type DecodeEventLogReturnType,
  decodeEventLog,
  type ContractEventName,
  type Log
} from 'viem';
import type { BlockType } from '../actions/types';
import { getBlock, getBlockNumber, getLogs } from 'viem/actions';

/**
 * Parameters for fetching logs in chunks.
 * @template TAbi - The ABI type.
 */
type FetchLogsInChunksParams<TAbi extends Abi> = {
  /** An instance of the viem PublicClient. */
  publicClient: PublicClient;
  /** The ABI of the contract. */
  abi: TAbi;
  /** The name of the event to fetch logs for. */
  eventName: ContractEventName<TAbi>;
  /** Parameters for the log fetch query. */
  fetchParams: {
    /** The address of the contract. */
    address: `0x${string}`;
    /** Optional arguments to filter the logs. */
    args?: GetEventArgs<TAbi, ContractEventName<TAbi>>;
  };
  /** The starting block number for the fetch. Defaults to 'earliest'. */
  fromBlock?: BlockType;
  /** The ending block number for the fetch. Defaults to 'latest'. */
  toBlock?: BlockType;
  /** The number of blocks to query in each chunk. Defaults to 5000. */
  chunkSize?: number;
};

type FetchLogsInChunksReturnType<TAbi extends Abi> = Array<
  DecodeEventLogReturnType<TAbi, ContractEventName<TAbi>> & Log
>;

/**
 * Fetches logs in chunks to handle potentially large range queries efficiently.
 * @template TAbi - The ABI type.
 * @param {FetchLogsInChunksParams<TAbi>} params - The parameters for fetching logs in chunks.
 * @returns {Promise<FetchLogsInChunksReturnType>} A flattened array of all logs fetched in chunks, including decoded event data.
 */
export const fetchLogsInChunks = async <TAbi extends Abi>({
  publicClient,
  abi,
  eventName,
  fetchParams,
  fromBlock,
  toBlock,
  chunkSize = 5000
}: FetchLogsInChunksParams<TAbi>): Promise<
  FetchLogsInChunksReturnType<TAbi>
> => {
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
    (item): item is AbiEvent => item.type === 'event' && item.name === eventName
  );

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
      ...decodeEventLog({
        abi,
        eventName,
        topics: log.topics,
        data: log.data
      })
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
