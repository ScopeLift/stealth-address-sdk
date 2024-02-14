import { sepolia } from 'viem/chains';

// Map of chain id to ERC5564Announcer contract addresses
export const announcerContracts = new Map<number, string>([
  [sepolia.id, '0x227733B68Bf2DF7c69C25A611B9378a523Fc4a03'],
]);
