import type { EthAddress, VALID_SCHEME_ID } from '../../../utils';
import type { ClientParams } from '../../stealthClient/types';
import type { PreparePayload } from '../types';

export type PrepareRegisterKeysParams = {
  ERC6538Address: EthAddress; // The address of the ERC6538 contract.
  schemeId: VALID_SCHEME_ID; // The scheme ID as per the ERC6538 specification.
  stealthMetaAddress: `0x${string}`; // The stealth meta-address to be registered.
  account: EthAddress; // The address of the account.
  clientParams?: ClientParams; // Optional client parameters for direct function usage.
};

export type PrepareRegisterKeysReturnType = PreparePayload;
