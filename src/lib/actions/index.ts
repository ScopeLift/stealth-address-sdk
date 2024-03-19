import getAnnouncements from './getAnnouncements/getAnnouncements';
import getStealthMetaAddress from './getStealthMetaAddress/getStealthMetaAddress';
import getAnnouncementsForUser from './getAnnouncementsForUser/getAnnouncementsForUser';
import type { StealthActions } from '../stealthClient/types';
export { default as getAnnouncements } from './getAnnouncements/getAnnouncements';
export { default as getStealthMetaAddress } from './getStealthMetaAddress/getStealthMetaAddress';
export { default as getAnnouncementsForUser } from './getAnnouncementsForUser/getAnnouncementsForUser';

export {
  type GetAnnouncementsParams,
  type GetAnnouncementsReturnType,
} from './getAnnouncements/types';
export {
  type GetStealthMetaAddressParams,
  type GetStealthMetaAddressReturnType,
} from './getStealthMetaAddress/types';
export {
  type GetAnnouncementsForUserParams,
  type GetAnnouncementsForUserReturnType,
} from './getAnnouncementsForUser/types';

export const actions: StealthActions = {
  getAnnouncements,
  getAnnouncementsForUser,
  getStealthMetaAddress,
};
