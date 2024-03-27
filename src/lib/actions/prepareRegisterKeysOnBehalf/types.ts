import type { EthAddress, VALID_SCHEME_ID } from '../../../utils';
import type { ClientParams } from '../../stealthClient/types';
import type { PreparePayload } from '../types';

export type RegisterKeysOnBehalfArgs = {
  registrant: EthAddress; // The address of the user for whom keys are being registered. TODO: this can also be an ens name.
  schemeId: VALID_SCHEME_ID; // The scheme ID as per the ERC6538 specification.
  stealthMetaAddress: `0x${string}`; // The stealth meta-address to be registered on behalf.
  signature: `0x${string}`; // The signature authorizing the registration.
};

export type PrepareRegisterKeysOnBehalfParams = {
  ERC6538Address: EthAddress; // The address of the ERC6538 contract.
  args: RegisterKeysOnBehalfArgs; // The arguments for the registerKeysOnBehalf function.
  account: EthAddress; // The address of the account making the call.
  clientParams?: ClientParams; // Optional client parameters for direct function usage.
};

export type PrepareRegisterKeysOnBehalfReturnType = PreparePayload;
