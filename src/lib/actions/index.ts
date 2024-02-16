import { getAnnouncements } from '.';
import type { StealthActions } from '../stealthClient/types';
export { default as getAnnouncements } from './getAnnouncements/getAnnouncements';

export const actions: StealthActions = {
  getAnnouncements,
  getStealthMetaAddress,
};
