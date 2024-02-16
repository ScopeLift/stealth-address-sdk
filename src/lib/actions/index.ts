import getAnnouncements from './getAnnouncements/getAnnouncements';
import getStealthMetaAddress from './getStealthMetaAddress/getStealthMetaAddress';
import type { StealthActions } from '../stealthClient/types';
export { default as getAnnouncements } from './getAnnouncements/getAnnouncements';
export { default as getStealthMetaAddress } from './getStealthMetaAddress/getStealthMetaAddress';

export {
  type GetAnnouncementsParams,
  type GetAnnouncementsReturnType,
} from './getAnnouncements/types';
export {
  type GetStealthMetaAddressParams,
  type GetStealthMetaAddressReturnType,
} from './getStealthMetaAddress/types';

export const actions: StealthActions = {
  getAnnouncements,
  getStealthMetaAddress,
};
