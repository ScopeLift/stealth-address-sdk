import type { Address } from 'viem';

export enum VALID_SCHEME_ID {
  SCHEME_ID_1 = '1',
}

export type HexString = `0x${string}`;
export type EthAddress = Address;

/**
 * Represents the output of the generateStealthAddress function,
 * containing the stealth address, ephemeralPublicKey, and viewTag according to the spec.
 */
export type GenerateStealthAddressReturnType = {
  /** The generated stealth address. */
  stealthAddress: EthAddress;
  /** The ephemeral public key used to generate the stealth address. */
  ephemeralPublicKey: HexString;
  /** The view tag derived from the hashed shared secret. */
  viewTag: HexString;
};

export interface IGenerateStealthAddressParams {
  /** the stealth meta address in format: "<st><chain><stealthMetaAddress>" */
  stealthMetaAddressURI: string;
  /** the schemeId to use for the stealth address generation; defaults to use schemeId 1 */
  schemeId?: VALID_SCHEME_ID;
  /** the ephemeral private key to use for the stealth address generation; defaults to generate a new one */
  ephemeralPrivateKey?: Uint8Array;
}

export type Hex = Uint8Array | HexString;

export interface IParseSpendAndViewKeysReturnType {
  spendingPublicKey: Hex;
  viewingPublicKey: Hex;
}
