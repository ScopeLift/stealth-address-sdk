import type { EthAddress, VALID_SCHEME_ID } from '../../..';
import type { ClientParams } from '../../stealthClient/types';
import type { PreparePayload } from '../types';

export type PrepareAnnounceParams = {
  account: EthAddress;
  args: PrepareAnnounceArgs;
  clientParams?: ClientParams;
  ERC5564Address: EthAddress;
};

export type PrepareAnnounceReturnType = PreparePayload;

export type PrepareAnnounceArgs = {
  schemeId: VALID_SCHEME_ID;
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  metadata: `0x${string}`;
};
