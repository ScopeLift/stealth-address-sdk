import { getAnnouncements } from '.';
import type { StealthActions } from './types';
export { default as getAnnouncements } from './getAnnouncements/getAnnouncements';

export const actions: StealthActions = {
  getAnnouncements,
};
