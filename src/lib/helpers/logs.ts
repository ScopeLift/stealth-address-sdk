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
  fromBlock?: bigint | 'earliest';
  /** The ending block number for the fetch. Defaults to 'latest'. */
  toBlock?: bigint | 'latest';
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
  fromBlock = 'earliest',
  toBlock = 'latest',
  chunkSize = 5000
}: FetchLogsInChunksParams<TAbi>): Promise<
  FetchLogsInChunksReturnType<TAbi>
> => {
  const [resolvedFromBlock, resolvedToBlock] = await Promise.all([
    resolveBlockNumber({ publicClient, block: fromBlock }),
    resolveBlockNumber({ publicClient, block: toBlock })
  ]);

  const eventAbi = abi.find(
    (item): item is AbiEvent => item.type === 'event' && item.name === eventName
  );

  let currentBlock = resolvedFromBlock;
  const allLogs = [];

  while (currentBlock <= resolvedToBlock) {
    const endBlock = BigInt(
      Math.min(Number(currentBlock) + chunkSize, Number(resolvedToBlock))
    );

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
async function resolveBlockNumber({
  publicClient,
  block
}: {
  publicClient: PublicClient;
  block?: bigint | 'earliest' | 'latest';
}): Promise<bigint> {
  if (typeof block === 'bigint') {
    return block;
  }

  if (block === 'latest') {
    return getBlockNumber(publicClient);
  }

  const { number } = await getBlock(publicClient, { blockTag: block });
  return number ?? getBlockNumber(publicClient);
}
