import type { Address } from "viem";

export enum VALID_SCHEME_ID {
  SCHEME_ID_1 = "1",
}

export type HexString = `0x${string}`;
export type EthAddress = Address;

export type GenerateStealthAddressReturnType = {
  stealthAddress: EthAddress;
  ephemeralPublicKey: HexString;
  viewTag: HexString;
};

export interface IGenerateStealthAddress {
  stealthMetaAddressURI: string;
  schemeId?: VALID_SCHEME_ID;
  ephemeralPrivateKey?: Uint8Array;
}

export type Hex = Uint8Array | HexString;

export interface IParseSpendAndViewKeysReturnType {
  spendingPublicKey: Hex;
  viewingPublicKey: Hex;
}
