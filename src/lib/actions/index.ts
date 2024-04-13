import getAnnouncements from './getAnnouncements/getAnnouncements';
import getStealthMetaAddress from './getStealthMetaAddress/getStealthMetaAddress';
import getAnnouncementsForUser from './getAnnouncementsForUser/getAnnouncementsForUser';
import watchAnnouncementsForUser from './watchAnnouncementsForUser/watchAnnouncementsForUser';
import prepareAnnounce from './prepareAnnounce/prepareAnnounce';
import prepareRegisterKeys from './prepareRegisterKeys/prepareRegisterKeys';
import prepareRegisterKeysOnBehalf from './prepareRegisterKeysOnBehalf/prepareRegisterKeysOnBehalf';
import type { StealthActions } from '../stealthClient/types';
export { default as getAnnouncements } from './getAnnouncements/getAnnouncements';
export { default as getStealthMetaAddress } from './getStealthMetaAddress/getStealthMetaAddress';
export { default as getAnnouncementsForUser } from './getAnnouncementsForUser/getAnnouncementsForUser';
export { default as watchAnnouncementsForUser } from './watchAnnouncementsForUser/watchAnnouncementsForUser';
export { default as prepareAnnounce } from './prepareAnnounce/prepareAnnounce';
export { default as prepareRegisterKeys } from './prepareRegisterKeys/prepareRegisterKeys';
export { default as prepareRegisterKeysOnBehalf } from './prepareRegisterKeysOnBehalf/prepareRegisterKeysOnBehalf';

export {
  type AnnouncementArgs,
  type AnnouncementLog,
  type GetAnnouncementsParams,
  type GetAnnouncementsReturnType
} from './getAnnouncements/types';
export {
  type GetStealthMetaAddressParams,
  type GetStealthMetaAddressReturnType
} from './getStealthMetaAddress/types';
export {
  type GetAnnouncementsForUserParams,
  type GetAnnouncementsForUserReturnType
} from './getAnnouncementsForUser/types';
export {
  type WatchAnnouncementsForUserParams,
  type WatchAnnouncementsForUserReturnType
} from './watchAnnouncementsForUser/types';
export {
  type PrepareAnnounceParams,
  type PrepareAnnounceReturnType
} from './prepareAnnounce/types';
export {
  type PrepareRegisterKeysParams,
  type PrepareRegisterKeysReturnType
} from './prepareRegisterKeys/types';
export {
  type PrepareRegisterKeysOnBehalfParams,
  type PrepareRegisterKeysOnBehalfReturnType
} from './prepareRegisterKeysOnBehalf/types';

export const actions: StealthActions = {
  getAnnouncements,
  getAnnouncementsForUser,
  getStealthMetaAddress,
  watchAnnouncementsForUser,
  prepareAnnounce,
  prepareRegisterKeys,
  prepareRegisterKeysOnBehalf
};
