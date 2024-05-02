export {
  generatePrivateKey,
  generateStealthAddress,
  getHashedSharedSecret,
  getStealthPublicKey,
  getViewTag,
  handleSchemeId,
  parseKeysFromStealthMetaAddress,
  parseStealthMetaAddressURI,
  publicKeyToAddress
} from './generateStealthAddress';

export { default as computeStealthKey } from './computeStealthKey';

export { default as checkStealthAddress } from './checkStealthAddress';

export {
  type EthAddress,
  type GenerateStealthAddressReturnType,
  type ICheckStealthAddressParams,
  type IComputeStealthKeyParams,
  type IGenerateStealthAddressParams,
  VALID_SCHEME_ID
} from './types';
