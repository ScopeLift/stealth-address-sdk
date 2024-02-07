import type { Address } from 'viem';

export enum VALID_SCHEME_ID {
  SCHEME_ID_1 = '1',
}

export type HexString = `0x${string}`;
export type EthAddress = Address;

/**
 * Represents the output of the generateStealthAddress function,
 * containing the stealth address and other relevant cryptographic details.
 */
export type GenerateStealthAddressReturnType = {
  stealthAddress: EthAddress;
  ephemeralPublicKey: HexString;
  viewTag: HexString;
};

export interface IGenerateStealthAddressParams {
  stealthMetaAddressURI: string;
  schemeId?: VALID_SCHEME_ID;
  ephemeralPrivateKey?: Uint8Array;
}

export type Hex = Uint8Array | HexString;

export interface IParseSpendAndViewKeysReturnType {
  spendingPublicKey: Hex;
  viewingPublicKey: Hex;
}
