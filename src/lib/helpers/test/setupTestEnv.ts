import { createStealthClient } from '../..';
import { ERC5564_CONTRACT, ERC6538_CONTRACT } from '../../..';
import type { VALID_CHAIN_IDS } from '../types';

/**
 * Initializes a test environment testing purposes.
 * @param {boolean} useLocal - Flag to determine if the local or remote RPC URL should be used.
 * To use a local RPC URL, set the TEST_LOCAL_NODE_ENDPOINT environment variable and use (for example)
 * anvil to fork your rpc url. To use a remote RPC URL, set the TEST_RPC_URL environment variable and set useLocal to false.
 * @returns An object containing the testing environment setup parameters including chain ID, contract addresses, and a stealth client instance.
 */
function setupTestEnv(useLocal: boolean = true) {
  if (!process.env.TEST_CHAIN_ID) {
    throw new Error('TEST_CHAIN_ID is not defined');
  }
  // Setup stealth client
  const chainId = getValidChainId(Number(process.env.TEST_CHAIN_ID));
  const rpcUrl = getRpcUrl(useLocal);
  const stealthClient = createStealthClient({ rpcUrl, chainId });

  // Setup ERC5564 contract details
  const ERC5564DeployBlockEnv = process.env.TEST_ERC5564_DEPLOY_BLOCK;
  if (!ERC5564DeployBlockEnv) {
    throw new Error('TEST_ERC5564_DEPLOY_BLOCK is not defined');
  }

  const ERC5564DeployBlock = BigInt(ERC5564DeployBlockEnv);
  const ERC5564Address = ERC5564_CONTRACT.SEPOLIA;

  // Setup ERC6538 contract details
  const ERC6538Address = ERC6538_CONTRACT.SEPOLIA;
  if (!ERC6538Address) {
    throw new Error('TEST_ERC6538_ADDRESS is not defined');
  }

  return {
    chainId,
    ERC5564Address,
    ERC5564DeployBlock,
    ERC6538Address,
    stealthClient,
  };
}

/**
 * Validates the provided chain ID against a list of valid chain IDs.
 * @param {number} chainId - The chain ID to validate.
 * @returns {VALID_CHAIN_IDS} - The validated chain ID.
 * @throws {Error} If the chain ID is not valid.
 */
function getValidChainId(chainId: number): VALID_CHAIN_IDS {
  if (chainId === 11155111 || chainId === 1) {
    return chainId as VALID_CHAIN_IDS;
  }
  throw new Error(`Invalid chain ID: ${chainId}`);
}

/**
 * Retrieves the RPC URL based on the `useLocal` flag.
 * @param {boolean} useLocal - Determines which environment variable to use for the RPC URL.
 * @returns {string} The RPC URL.
 * @throws {Error} If the corresponding environment variable is not defined.
 */
function getRpcUrl(useLocal: boolean = true): string {
  const rpcUrl = useLocal
    ? process.env.TEST_LOCAL_NODE_ENDPOINT
    : process.env.TEST_RPC_URL;
  if (!rpcUrl) {
    throw new Error(
      useLocal
        ? 'TEST_LOCAL_NODE_ENDPOINT is not defined'
        : 'TEST_RPC_URL is not defined'
    );
  }
  return rpcUrl;
}

export { getValidChainId, getRpcUrl };
export default setupTestEnv;
