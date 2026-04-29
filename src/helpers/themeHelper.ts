import Cookies from 'js-cookie';
import { THEMES } from '../theme/themes';

export const getStoredTheme = () => {
  const themeValue = Cookies.get('theme');
  // Returns the actual theme object based on cookie, defaults to dark
  return themeValue === 'light' ? THEMES.light : THEMES.dark;
};

export const setStoredTheme = (isDark: boolean) => {
  Cookies.set('theme', isDark ? 'dark' : 'light', { expires: 365 });
};

export const isThemeDark = () => Cookies.get('theme') !== 'light';