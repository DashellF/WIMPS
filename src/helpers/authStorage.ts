import AsyncStorage from '@react-native-async-storage/async-storage';
import Cookies from 'js-cookie';
import { Platform } from 'react-native';

const WEB_TOKEN_KEY = 'token';
const NATIVE_TOKEN_KEY = '@auth_token';

const isWeb = Platform.OS === 'web';

const canUseLocalStorage = () =>
  typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined';

const getLocalStorageItem = (key: string): string | null => {
  if (!canUseLocalStorage()) return null;

  try {
    return (globalThis as any).localStorage.getItem(key);
  } catch (err) {
    console.error('Unable to read localStorage auth token', err);
    return null;
  }
};

const setLocalStorageItem = (key: string, value: string) => {
  if (!canUseLocalStorage()) return;

  try {
    (globalThis as any).localStorage.setItem(key, value);
  } catch (err) {
    console.error('Unable to write localStorage auth token', err);
  }
};

const removeLocalStorageItem = (key: string) => {
  if (!canUseLocalStorage()) return;

  try {
    (globalThis as any).localStorage.removeItem(key);
  } catch (err) {
    console.error('Unable to clear localStorage auth token', err);
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  if (isWeb) {
    return Cookies.get(WEB_TOKEN_KEY) || getLocalStorageItem(WEB_TOKEN_KEY);
  }

  try {
    return await AsyncStorage.getItem(NATIVE_TOKEN_KEY);
  } catch (err) {
    console.error('Unable to read AsyncStorage auth token', err);
    return null;
  }
};

export const saveAuthToken = async (token: string) => {
  if (isWeb) {
    Cookies.set(WEB_TOKEN_KEY, token, { expires: 1, sameSite: 'lax' });
    setLocalStorageItem(WEB_TOKEN_KEY, token);
    return;
  }

  try {
    await AsyncStorage.setItem(NATIVE_TOKEN_KEY, token);
  } catch (err) {
    console.error('Unable to write AsyncStorage auth token', err);
    throw err;
  }
};

export const clearAuthToken = async () => {
  if (isWeb) {
    Cookies.remove(WEB_TOKEN_KEY);
    removeLocalStorageItem(WEB_TOKEN_KEY);
    return;
  }

  try {
    await AsyncStorage.removeItem(NATIVE_TOKEN_KEY);
  } catch (err) {
    console.error('Unable to clear AsyncStorage auth token', err);
  }
};

export const getApiHeaders = (token?: string | null, json = false): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (json) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Browser requests to a free ngrok URL can be served the ngrok warning page instead
  // of the API response. Native Android requests do not usually hit that browser flow.
  if (isWeb) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  return headers;
};
