import {
  ERC5564AnnouncerAbi,
  ERC5564_BYTECODE,
  ERC6538RegistryAbi,
  ERC6538_BYTECODE
} from '..';
import deployContract from './deployContract';

const deployAllContracts = async () => {
  const { address: erc5564ContractAddress, deployBlock: erc5564DeployBlock } =
    await deployContract({
      abi: ERC5564AnnouncerAbi,
      name: 'ERC5564',
      bytecode: ERC5564_BYTECODE
    });

  const { address: erc6538ContractAddress } = await deployContract({
    abi: ERC6538RegistryAbi,
    name: 'ERC6538',
    bytecode: ERC6538_BYTECODE
  });

  return {
    erc5564ContractAddress,
    erc6538ContractAddress,
    erc5564DeployBlock
  };
};

export default deployAllContracts;
