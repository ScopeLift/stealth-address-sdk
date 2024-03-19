import { foundry } from 'viem/chains';
import { getChain } from '../chains';
import { createStealthClient } from '../..';
import deployAllContracts from '../../../scripts';
import type { VALID_CHAIN_IDS } from '../types';

/**
 * Initializes a test environment for testing purposes.
 * Defaults to local anvil node usage or, alternatively, use a remote RPC URL by setting the TEST_RPC_URL environment variable
 * @returns An object containing the testing environment setup parameters including chain ID, contract addresses, and a stealth client instance.
 */
const setupTestEnv = async () => {
  // Setup stealth client
  const { chainId } = getChainInfo();
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
const getRpcUrl = (): string =>
  process.env.TEST_RPC_URL ?? foundry.rpcUrls.default.http[0];

const getChainInfo = () => {
  // If chainId is not defined, use the foundry chain ID as default
  const chainId = process.env.TEST_CHAIN_ID
    ? Number(process.env.TEST_CHAIN_ID)
    : foundry.id;
  const validChainId = getValidChainId(Number(chainId));
  return { chain: getChain(validChainId), chainId: validChainId };
};

export { getValidChainId, getRpcUrl, getChainInfo };
export default setupTestEnv;
