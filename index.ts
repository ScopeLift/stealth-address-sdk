import { getBlock, getLogs } from "viem/actions";
import { type PublicClient } from "viem";
import { announcementEvent, type BlockType } from "./types/abiEvents";
import { genRandomNumber } from "./lib/crypto";

// "public key" key is public key
// "key" key is private key

/**
 * Crypto stuff
 */

const cryptoStuffWeDoKnow = (publicKey: address) => {
  return publicKey + 1;
};

// assume we know the crypto stuff (for a given input, we know the output)
const genStealthMetaAddress = ({
  publicKey,
  schemeId,
  cryptoStuffWeDontKnow,
}: {
  publicKey: address;
  schemeId?: number;
  cryptoStuffWeDontKnow?: (publicKey: address) => string;
}) => {
  if (schemeId !== 1) return "borked";

  // we know this crypto stuff do it
  return cryptoStuffWeDoKnow(publicKey);
};

// from the perspective of someone who is using the sdk
const genStealthMetaAddressWrap = ({}) => {
  const cyproStuffWeDontKnow = (publicKey: address) => {
    return publicKey + 2;
  };
  genStealthMetaAddress({
    publicKey: "0x123",
    schemeId: 1,
    cryptoStuffWeDontKnow,
  });
};

/**
 * Given a stealth meta-address (which includes the public spending key and optionally the public viewing key),
 * generate a unique stealth address.
 * @param stealthMetaAddress the stealth meta-address
 * @returns
 */
const getStealthAddress = ({
  stealthMetaAddress,
}: {
  stealthMetaAddress: `0x${string}`;
}) => {
  const randomNumber = genRandomNumber();
  const stealthAddress = ``;
  return stealthAddress;
};

/**
 * Generates a stealth address private key from a non-stealth address public key
 * @param address the non-stealth address public key
 * @returns
 */
const generatePrivateKey = ({ publicKey }: { publicKey: `0x${string}` }) => {
  const privateKey = ``;
  return privateKey;
};

/**
 * Reading Chain Stuff
 */

/**
 *
 * @param address the non-stealth address public key
 * @param schemeId the scheme id
 */
const getPublicKey = ({
  address,
  schemeId,
}: {
  address: `0x${string}`;
  schemeId: number;
}) => {};

/**
 * Get the Announcement events given a scheme id
 * @param publicClient the public client; initially only viem, but need to support ethers
 * @param IERC5564Address the IERC5564 contract address
 * @param args the Announcement event arguments
 * @param fromBlock the block to start from
 * @param toBlock the block to end at
 * @returns the announcement events
 */
const getAnnouncements = async ({
  publicClient,
  IERC5564Address,
  args,
  fromBlock,
  toBlock,
}: {
  publicClient: PublicClient;
  schemeId: number;
  IERC5564Address: `0x${string}`;
  announcer?: `0x${string}`;
  args: {
    schemeId?: bigint | bigint[] | null | undefined;
    stealthAddress?: `0x${string}` | `0x${string}`[] | null | undefined;
    caller?: `0x${string}` | `0x${string}`[] | null | undefined;
  };
  fromBlock?: BlockType;
  toBlock?: BlockType;
}) => {
  const fetchParams = {
    address: IERC5564Address,
    event: announcementEvent,
    args,
  };

  const announcements = await fetchLogsInChunks({
    publicClient,
    fetchParams,
    fromBlock,
    toBlock,
  });

  return announcements;
};

/**
 * Fetch logs in chunks to avoid hitting limits.
 * @param publicClient The public client (Viem or Ethers)
 * @param fetchParams Parameters required for fetching logs
 * @returns Concatenated logs from all chunks
 */
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
    event: any;
    args: any;
    fromBlock?: BlockType;
    toBlock?: BlockType;
  };
  fromBlock?: BlockType;
  toBlock?: BlockType;
  chunkSize?: number;
}) => {
  const resolvedFromBlock = await resolveBlockNumber({
    publicClient,
    block: fromBlock ?? "earliest",
  });
  const resolvedToBlock = await resolveBlockNumber({
    publicClient,
    block: toBlock ?? "latest",
  });

  let currentBlock = resolvedFromBlock;
  const allLogs = [];

  while (currentBlock <= resolvedToBlock) {
    const endBlock = Math.min(currentBlock + chunkSize, resolvedToBlock);
    const logs = await getLogs(publicClient, {
      ...fetchParams,
      fromBlock: currentBlock,
      toBlock: resolvedToBlock,
    });
    allLogs.push(...logs);
    currentBlock = endBlock + 1;
  }

  return allLogs;
};

const resolveBlockNumber = async ({
  publicClient,
  block,
}: {
  publicClient: PublicClient;
  block?: BlockType;
}) => {
  if (typeof block === "bigint") {
    return block;
  }

  return await getBlock(publicClient, { blockTag: block }).number;
};

/**
 * Writing Chain Stuff
 */

/**
 * Generates the payload for making an announcement and calling the contract
 * @param param0
 */
const makeAnnouncement = async ({}) => {};

/**
 * Sets the public key
 * @param param0
 */
const setPublicKey = async ({}) => {};

/**
 * Perform signing for setting on behalf messages
 * @param param0
 */
const signOnBehalf = async ({}) => {};
