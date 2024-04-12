import {
  ERC5564AnnouncerAbi,
  ERC5564_CONTRACT,
  ERC6538_CONTRACT,
  ERC6538RegistryAbi,
} from '..';
import setupTestWallet from '../lib/helpers/test/setupTestWallet';

/**
 * Deploys a specified contract
 * @param param0 - The contract address, abi, and optional name
 * @property {`0x${string}`} address - The contract address as a reference to be able to get the bytecode
 * @property {typeof ERC5564AnnouncerAbi | typeof ERC6538RegistryAbi} abi - The contract ABI
 * @property {`0x${string}`} bytecode - The contract bytecode
 * @property {string} name Optional contract name for logging
 * @returns {Promise<`0x${string}`>} - The address of the deployed contract
 */
const deployContract = async ({
  address,
  abi,
  bytecode,
  name,
}: {
  address: ERC5564_CONTRACT | ERC6538_CONTRACT;
  abi: typeof ERC5564AnnouncerAbi | typeof ERC6538RegistryAbi;
  bytecode: `0x${string}`;
  name: string;
}): Promise<{
  address: `0x${string}`;
  deployBlock: bigint;
}> => {
  const walletClient = await setupTestWallet();

  const hash = await walletClient.deployContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    abi,
    bytecode,
    gas: BigInt(1_000_000),
  });

  const { contractAddress, blockNumber } =
    await walletClient.waitForTransactionReceipt({ hash });

  if (!contractAddress) {
    throw new Error(`Failed to deploy ${name} contract`);
  }

  return { address: contractAddress, deployBlock: blockNumber };
};

export default deployContract;
