import { createStealthClient } from '../..';
import { ERC5564_CONTRACT } from '../../..';
import type { VALID_CHAIN_IDS } from '../types';

function setupTestEnv() {
  if (!process.env.TEST_CHAIN_ID) {
    throw new Error('TEST_CHAIN_ID is not defined');
  }
  // Setup stealth client
  const chainId = getValidChainId(Number(process.env.TEST_CHAIN_ID));

  const rpcUrl = process.env.TEST_RPC_URL;
  if (!rpcUrl) {
    throw new Error('TEST_RPC_URL is not defined');
  }
  const stealthClient = createStealthClient({ rpcUrl, chainId });

  // Setup ERC5564 contract details
  const ERC5564DeployBlockEnv = process.env.TEST_ERC5564_DEPLOY_BLOCK;
  if (!ERC5564DeployBlockEnv) {
    throw new Error('TEST_ERC5564_DEPLOY_BLOCK is not defined');
  }

  const ERC5564DeployBlock = BigInt(ERC5564DeployBlockEnv);
  const ERC5564Address = ERC5564_CONTRACT.SEPOLIA;

  return {
    stealthClient,
    ERC5564DeployBlock,
    ERC5564Address,
    chainId,
  };
}

// Function to check if the given chain ID is valid and return it as VALID_CHAIN_IDS
function getValidChainId(chainId: number): VALID_CHAIN_IDS {
  if (chainId === 11155111 || chainId === 1) {
    return chainId as VALID_CHAIN_IDS;
  }
  throw new Error(`Invalid chain ID: ${chainId}`);
}

export { getValidChainId };
export default setupTestEnv;
