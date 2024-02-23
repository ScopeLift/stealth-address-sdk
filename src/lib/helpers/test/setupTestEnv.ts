import { foundry } from 'viem/chains';
import { getChain } from '../chains';
import { createStealthClient } from '../..';
import deployAllContracts from '../../../scripts';
import type { VALID_CHAIN_IDS } from '../types';
import { fromHex } from 'viem';

const LOCAL_ENDPOINT = 'http://127.0.0.1:8545';

/**
 * Initializes a test environment for testing purposes.
 * Defaults to local anvil node usage or, alternatively, use a remote RPC URL by setting the TEST_RPC_URL environment variable
 * @returns An object containing the testing environment setup parameters including chain ID, contract addresses, and a stealth client instance.
 */
const setupTestEnv = async () => {
  // Setup stealth client
  const { chainId } = await getChainInfo();
  const rpcUrl = getRpcUrl();
  const stealthClient = createStealthClient({ rpcUrl, chainId });

  // Deploy ERC5564 and ERC6538 contracts
  const {
    erc5564ContractAddress: ERC5564Address,
    erc6538ContractAddress: ERC6538Address,
    erc5564DeployBlock: ERC5564DeployBlock,
  } = await deployAllContracts();

  return {
    chainId,
    ERC5564Address,
    ERC5564DeployBlock,
    ERC6538Address,
    stealthClient,
  };
};

/**
 * Validates the provided chain ID against a list of valid chain IDs.
 * @param {number} chainId - The chain ID to validate.
 * @returns {VALID_CHAIN_IDS} - The validated chain ID.
 * @throws {Error} If the chain ID is not valid.
 */
const getValidChainId = (chainId: number): VALID_CHAIN_IDS => {
  if (chainId === 11155111 || chainId === 1 || chainId === 31337) {
    return chainId as VALID_CHAIN_IDS;
  }
  throw new Error(`Invalid chain ID: ${chainId}`);
};

/**
 * Retrieves the TEST RPC URL from env or defaults to foundry http.
 * @returns {string } The RPC URL.
 */
const getRpcUrl = (): string => {
  if (process.env.USE_FORK) {
    // Check that the RPC_URL is defined if using a fork
    if (!process.env.RPC_URL) {
      throw new Error('RPC_URL not defined in env');
    }
    // Use the local node endpoint for the rpc url
    return LOCAL_ENDPOINT;
  }

  return foundry.rpcUrls.default.http[0];
};

const getChainInfo = async () => {
  const chainId = await fetchChainId();
  const validChainId = getValidChainId(chainId);
  return { chain: getChain(validChainId), chainId: validChainId };
};

const fetchChainId = async (): Promise<number> => {
  // If not running fork test script, use the foundry chain ID
  if (!process.env.USE_FORK) {
    console.log(
      `Using foundry chain ID: ${foundry.id}; make sure you ran the fork test script if that's what you wanted`
    );
    return foundry.id;
  }

  if (!process.env.RPC_URL) {
    throw new Error('RPC_URL not defined in env');
  }

  try {
    const response = await fetch(process.env.RPC_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_chainId',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    interface ChainIdResponse {
      version: string;
      id: number;
      result: `0x${string}`;
    }
    const data = (await response.json()) as ChainIdResponse;

    return fromHex(data.result, 'number');
  } catch (error) {
    throw new Error(`Failed to get the chain ID`);
  }
};

export { getValidChainId, getRpcUrl, getChainInfo };
export default setupTestEnv;
