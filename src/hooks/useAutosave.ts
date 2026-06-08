import { useCallback, useEffect, useRef, useState } from 'react';
import { clearAuthToken, getApiHeaders, getAuthToken } from '../helpers/authStorage';

interface CodeTab {
  id: string;
  name: string;
  code: string;
  isDirty?: boolean;
  _id?: string;
}

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface UseAutosaveOptions {
  tabsRef: React.RefObject<CodeTab[]>;
  isLoggedIn: boolean;
  setTabs: React.Dispatch<React.SetStateAction<CodeTab[]>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  apiBase: string;
  debounceMs?: number;
}

export function useAutosave({
  tabsRef,
  isLoggedIn,
  setTabs,
  setIsLoggedIn,
  apiBase,
  debounceMs = 1500,
}: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastPayloadRef = useRef('');
  const isLoggedInRef = useRef(isLoggedIn);
  useEffect(() => { isLoggedInRef.current = isLoggedIn; }, [isLoggedIn]);

  // Stable ref to the save function so it can call itself without circular deps
  const doSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);

  doSaveRef.current = async () => {
    if (!isLoggedInRef.current) return;
    const token = getAuthToken();
    if (!token) return;

    const currentTabs = tabsRef.current ?? [];
    if (!currentTabs.some(t => t.isDirty)) {
      setStatus('saved');
      return;
    }

    const clean = currentTabs.map(t => ({ ...t, isDirty: false }));
    const payload = JSON.stringify(clean);

    // No-op guard: skip if nothing actually changed since last successful save
    if (payload === lastPayloadRef.current) {
      setStatus('saved');
      return;
    }

    inFlightRef.current = true;
    setStatus('saving');
    if (savedTimerRef.current !== null) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }

    try {
      // GET server tabs first to preserve closed-but-saved files
      const getRes = await fetch(`${apiBase}/auth/tabs`, { headers: getApiHeaders(token) });
      if (getRes.status === 401) {
        clearAuthToken();
        setIsLoggedIn(false);
        setStatus('error');
        inFlightRef.current = false;
        return;
      }
      const serverTabs: CodeTab[] = getRes.ok ? await getRes.json() : [];
      const openIds = new Set(clean.map(t => t.id));
      const merged = [...serverTabs.filter(t => !openIds.has(t.id)), ...clean];

      const postRes = await fetch(`${apiBase}/auth/tabs`, {
        method: 'POST',
        headers: getApiHeaders(token, true),
        body: JSON.stringify({ tabs: merged }),
      });

      if (postRes.status === 401) {
        clearAuthToken();
        setIsLoggedIn(false);
        setStatus('error');
        inFlightRef.current = false;
        return;
      }

      if (postRes.status === 413) {
        // File limit exceeded — don't retry, just surface error
        setStatus('error');
        inFlightRef.current = false;
        return;
      }

      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);

      // Success
      lastPayloadRef.current = payload;
      retryCountRef.current = 0;
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setTabs(prev => prev.map(t => ({ ...t, isDirty: false })));
      setStatus('saved');
      setLastSavedAt(Date.now());
      inFlightRef.current = false;

      // Fade back to idle after 2s
      savedTimerRef.current = setTimeout(() => {
        setStatus('idle');
        savedTimerRef.current = null;
      }, 2000);

      // If another save was requested while this one was in flight, run it now
      if (pendingRef.current) {
        pendingRef.current = false;
        doSaveRef.current?.();
      }
    } catch {
      inFlightRef.current = false;
      setStatus(!navigator.onLine ? 'offline' : 'error');

      // Exponential backoff retry (skip if one is already scheduled)
      if (retryTimerRef.current !== null) return;
      const delays = [2000, 5000, 15000, 30000];
      const delay = delays[Math.min(retryCountRef.current, delays.length - 1)];
      retryCountRef.current++;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        doSaveRef.current?.();
      }, delay);
    }
  };

  // Retry immediately when network comes back
  useEffect(() => {
    const onOnline = () => {
      if (inFlightRef.current) return;
      const hasDirty = (tabsRef.current ?? []).some(t => t.isDirty);
      if (hasDirty) doSaveRef.current?.();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [tabsRef]);

  // Debounced save — safe to call on every change
  const scheduleSave = useCallback(() => {
    if (!isLoggedInRef.current) return;
    if (inFlightRef.current) { pendingRef.current = true; return; }
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      doSaveRef.current?.();
    }, debounceMs);
  }, [debounceMs]);

  // Immediate save — cancels pending debounce and fires now
  const flushNow = useCallback((): Promise<void> => {
    if (!isLoggedInRef.current) return Promise.resolve();
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (inFlightRef.current) {
      pendingRef.current = true;
      return Promise.resolve();
    }
    return doSaveRef.current?.() ?? Promise.resolve();
  }, []);

  return { status, lastSavedAt, scheduleSave, flushNow };
}
