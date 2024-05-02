import type { EthAddress, VALID_SCHEME_ID } from '../../../utils/crypto/types';
import type { ClientParams } from '../../stealthClient/types';

export type GetStealthMetaAddressParams = {
  clientParams?: ClientParams;
  ERC6538Address: EthAddress;
  registrant: `0x${string}`;
  schemeId: VALID_SCHEME_ID;
};
export type GetStealthMetaAddressReturnType = `0x${string}` | undefined;

export class GetStealthMetaAddressError extends Error {
  constructor(message = 'Error getting stealth meta address.') {
    super(message);
    this.name = 'GetStealthMetaAddressError';
    Object.setPrototypeOf(this, GetStealthMetaAddressError.prototype);
  }
}
