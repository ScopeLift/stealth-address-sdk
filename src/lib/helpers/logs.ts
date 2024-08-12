import {
  type PublicClient,
  type Abi,
  type AbiEvent,
  type GetEventArgs,
  decodeEventLog,
  type ContractEventName,
  type DecodeEventLogReturnType
} from 'viem';
import { getBlockNumber, getLogs } from 'viem/actions';

/**
 * Parameters for fetching and decoding logs in chunks.
 * @template TAbi - The ABI type.
 */
type FetchLogsParams<TAbi extends Abi> = {
  /** An instance of the viem PublicClient. */
  publicClient: PublicClient;
  /** The ABI of the contract. */
  abi: TAbi;
  /** The name of the event to fetch logs for. */
  eventName: ContractEventName<TAbi>;
  /** The address of the contract. */
  address: `0x${string}`;
  /** Optional arguments to filter the logs. */
  args?: GetEventArgs<TAbi, ContractEventName<TAbi>>;
  /** The starting block number for the fetch. Defaults to 'earliest'. */
  fromBlock?: bigint | 'earliest';
  /** The ending block number for the fetch. Defaults to 'latest'. */
  toBlock?: bigint | 'latest';
  /** The number of blocks to query in each chunk. Defaults to 5000. */
  chunkSize?: number;
};

type FetchLogsReturnType<TAbi extends Abi> = Array<
  DecodeEventLogReturnType<TAbi, ContractEventName<TAbi>> & {
    blockNumber: bigint;
    transactionHash: `0x${string}`;
    logIndex: number;
  }
>;

/**
 * Fetches and decodes logs in chunks to handle potentially large range queries efficiently.
 *
 * @template TAbi - The ABI type.
 * @param {FetchLogsParams<TAbi>} params - The parameters for fetching logs in chunks.
 * @returns {Promise<FetchLogsReturnType>} - A flattened array of all logs fetched in chunks, including decoded event data.
 *
 * @example
 * const logs = await fetchLogsInChunks({
 *   publicClient,
 *   abi: myContractABI,
 *   eventName: 'Transfer',
 *   address: '0x...',
 *   fromBlock: 1000000n,
 *   toBlock: 2000000n,
 *   chunkSize: 10000
 * });
 */
export const fetchLogsInChunks = async <TAbi extends Abi>({
  publicClient,
  abi,
  eventName,
  address,
  args,
  fromBlock = 'earliest',
  toBlock = 'latest',
  chunkSize = 5000
}: FetchLogsParams<TAbi>): Promise<FetchLogsReturnType<TAbi>> => {
  const [start, end] = await Promise.all([
    fromBlock === 'earliest'
      ? 0n
      : typeof fromBlock === 'bigint'
        ? fromBlock
        : getBlockNumber(publicClient),
    toBlock === 'latest' ? getBlockNumber(publicClient) : toBlock
  ]);

  const eventAbi = abi.find(
    (item): item is AbiEvent => item.type === 'event' && item.name === eventName
  );

  if (!eventAbi) throw new Error(`Event ${eventName} not found in ABI`);

  const allLogs = [];

  for (
    let currentBlock = start;
    currentBlock <= end;
    currentBlock += BigInt(chunkSize)
  ) {
    const logs = await getLogs(publicClient, {
      address,
      event: eventAbi,
      args,
      fromBlock: currentBlock,
      toBlock: BigInt(
        Math.min(Number(currentBlock) + chunkSize - 1, Number(end))
      ),
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
  }

  return allLogs;
};
