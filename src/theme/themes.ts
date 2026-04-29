import { StatusBarStyle } from 'react-native';

export type Theme = {
  bg: string;
  text: string;
  subText: string;
  card: string;
  border: string;
  resizer: string;
  tabActive: string;
  tabInactive: string;
  consoleText: string;
  btnBg: string;
  statusBarStyle: StatusBarStyle;
};

export const THEMES: Record<'dark' | 'light', Theme> = {
  dark: {
    bg: '#0b1020',
    text: '#f8fafc',
    subText: '#94a3b8',
    card: '#1f2937',
    border: '#1f2937',
    resizer: '#334155',
    tabActive: '#1e293b',
    tabInactive: '#111827',
    consoleText: '#cbd5e1',
    btnBg: '#111827',
    statusBarStyle: 'light-content',
  },
  light: {
    bg: '#f1f5f9',
    text: '#0f172a',
    subText: '#475569',
    card: '#ffffff',
    border: '#cbd5e1',
    resizer: '#94a3b8',
    tabActive: '#e2e8f0',
    tabInactive: '#ffffff',
    consoleText: '#334155',
    btnBg: '#ffffff',
    statusBarStyle: 'dark-content',
  },
};
