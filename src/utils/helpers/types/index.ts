import type { WalletClient } from 'viem';
import type { VALID_CHAIN_IDS } from '../../../lib/helpers/types';
import type { VALID_SCHEME_ID } from '../../crypto';

export interface GenerateSignatureForRegisterKeysParams {
  walletClient: WalletClient;
  account: `0x${string}`;
  ERC6538Address: `0x${string}`;
  chainId: VALID_CHAIN_IDS;
  schemeId: VALID_SCHEME_ID;
  stealthMetaAddressToRegister: `0x${string}`;
}

export class GenerateSignatureForRegisterKeysError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'GenerateSignatureForRegisterKeysError';
  }
}
