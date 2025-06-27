export type {
  GenerateSignatureForRegisterKeysError,
  GenerateSignatureForRegisterKeysParams
} from './types';

export type {
  ETHMetadataParams,
  ERC20MetadataParams,
  ERC721MetadataParams,
  CustomMetadataParams,
  MetadataComponents,
  ViewTag,
  FunctionSelector,
  TokenAmount
} from './types/buildMetadata';

export { default as generateKeysFromSignature } from './generateKeysFromSignature';
export { default as generateRandomStealthMetaAddress } from './generateRandomStealthMetaAddress';
export { default as generateSignatureForRegisterKeysOnBehalf } from './generateSignatureForRegisterKeysOnBehalf';
export { default as generateStealthMetaAddressFromKeys } from './generateStealthMetaAddressFromKeys';
export { default as generateStealthMetaAddressFromSignature } from './generateStealthMetaAddressFromSignature';
export { default as getViewTagFromMetadata } from './getViewTagFromMetadata';
export { default as isValidPublicKey } from './isValidPublicKey';

export {
  buildMetadataForETH,
  buildMetadataForERC20,
  buildMetadataForERC721,
  buildMetadataCustom,
  parseMetadata,
  ERC20_FUNCTION_SELECTORS,
  ERC721_FUNCTION_SELECTORS
} from './buildMetadata';
