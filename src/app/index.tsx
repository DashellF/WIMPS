// screens/IdeScreen.tsx
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Cookies from 'js-cookie';

import { CodeEditor } from '../components/CodeEditor';
import { MemoryView } from '../components/MemoryView';
import { RegisterPanel, RegisterValue } from '../components/RegisterPanel';
import { WindowWrapper } from '../components/WindowWrapper';
import { clearAuthToken, getApiHeaders, getAuthToken } from '../helpers/authStorage';
import { assemble, feedInput, getMemoryRange, getState, resetSim, runSim, stepSim } from '../simulator/useMips';

import { PageWrapper } from '@/components/PageWrapper';
import type { Theme } from '../theme/themes';
import { THEMES } from '../theme/themes';

// Safely enable LayoutAnimations avoiding warnings on New Architecture
const isNewArchitecture = (global as any).__turboModuleProxy != null;
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !isNewArchitecture) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const DEFAULT_TABS: CodeTab[] = [{ id: '1', name: 'file1.asm', code: '', isDirty: false }];

// --- Helper Components ---
interface ThemeSwitchProps {
  isDark: boolean;
  toggle: () => void;
}

const ThemeSwitch = ({ isDark, toggle }: ThemeSwitchProps) => {
  const slideAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(slideAnim, { toValue: isDark ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [isDark]);

  const thumbPosition = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 30] });
  const trackBg = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', '#2563eb'] });
  const trackBorder = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#cbd5e1', '#2563eb'] });
  const thumbBg = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#94a3b8', '#ffffff'] });
  const iconColor = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', '#2563eb'] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
      <Animated.View style={[styles.switchTrack, { backgroundColor: trackBg, borderColor: trackBorder }]}>
        <Animated.View style={[styles.switchThumb, { backgroundColor: thumbBg, transform: [{ translateX: thumbPosition }] }]}>
          <Animated.Text style={[styles.switchIcon, { color: iconColor }]}>{isDark ? '☾' : '☼'}</Animated.Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const buildInitialRegisters = (): RegisterValue[] => {
  const names = [
    '$zero', '$at', '$v0', '$v1', '$a0', '$a1', '$a2', '$a3',
    '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
    '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
    '$t8', '$t9', '$k0', '$k1', '$gp', '$sp', '$fp', '$ra',
  ];
  return names.map((name, index) => ({ name, number: index, hexValue: '0x00000000' }));
};

const DesktopMinimizedTab = ({ label, onPress, isDarkMode }: { label: string; onPress: () => void; isDarkMode: boolean }) => (
  <TouchableOpacity 
    style={[styles.tab, { backgroundColor: isDarkMode ? '#1e3a8a' : '#f8fafc', borderColor: isDarkMode ? '#60a5fa' : '#cbd5e1' }]} 
    onPress={onPress}
  >
    <Text style={[styles.tabText, { color: isDarkMode ? '#60a5fa' : '#334155' }]}>{label}</Text>
  </TouchableOpacity>
);

interface CodeTab {
  id: string;
  name: string;
  code: string;
  isDirty?: boolean;
  _id?: string; // Mongo/Mongoose id for tabs loaded from the database
}

const idToString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  if (typeof value === 'object' && typeof (value as { toString?: unknown }).toString === 'function') {
    const asString = (value as { toString: () => string }).toString();
    return asString && asString !== '[object Object]' ? asString : undefined;
  }

  return undefined;
};

const normalizeStoredTab = (item: any): CodeTab => {
  const mongoId = idToString(item?._id);
  const clientId = idToString(item?.id);
  const id = clientId || mongoId || String(Date.now() + Math.random());

  return {
    ...item,
    id,
    _id: mongoId,
    name: item?.name || 'untitled.asm',
    code: item?.code || '',
    isDirty: Boolean(item?.isDirty),
  };
};

const getTabIdentifiers = (tab: Partial<CodeTab> | null | undefined): string[] => {
  const identifiers = [idToString(tab?.id), idToString(tab?._id)].filter((id): id is string => Boolean(id));
  return identifiers.filter((id, index) => identifiers.indexOf(id) === index);
};

const tabMatchesIdentifiers = (tab: Partial<CodeTab>, identifiers: string[]) => {
  const tabIdentifiers = getTabIdentifiers(tab);
  return tabIdentifiers.some(id => identifiers.includes(id));
};

export default function IdeScreen() {
  const { height, width } = useWindowDimensions();
  const isWide = width >= 1000;

  // --- State ---
  const [tabs, setTabs] = useState<CodeTab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('1');

  const [activeLine, setActiveLine] = useState<number | null>(null);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTabName, setEditTabName] = useState<string>('');
  const [mobileView, setMobileView] = useState<'editor' | 'console' | 'registers' | 'memory'>('editor');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Load Menu State
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [dbFiles, setDbFiles] = useState<CodeTab[]>([]);

  const [registers, setRegisters] = useState<RegisterValue[]>(buildInitialRegisters());
  const [output, setOutput] = useState('Program output will appear here.');
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showHex, setShowHex] = useState(true);

  // Console Input State
  const [consoleInput, setConsoleInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);

  // Layout Percentages (Desktop Only)
  const [leftPanelPct, setLeftPanelPct] = useState(70);
  const [editorHeightPct, setEditorHeightPct] = useState(65);
  const [sideHeightPct, setSideHeightPct] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  const [minimized, setMinimized] = useState({
    editor: false,
    console: false,
    registers: false,
    memory: false,
  });

  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const renameInputRef = useRef<TextInput>(null);
  const editorColumnRef = useRef<View>(null);
  const editorColumnLayout = useRef({ y: 0, height: 0 });
  const sideColumnRef = useRef<View>(null);
  const sideColumnLayout = useRef({ y: 0, height: 0 });

  const tabsRef = useRef(tabs);
  const loadedSessionKeyRef = useRef<string | null>(null);

  const activeCode = useMemo(() => tabs.find(t => t.id === activeTabId)?.code || '', [tabs, activeTabId]);
  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);

  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  const readLocalTabs = (): CodeTab[] => {
    if (Platform.OS !== 'web') return [];

    try {
      const localTabs = localStorage.getItem('saved_tabs');
      const parsed = localTabs ? JSON.parse(localTabs) : [];
      return Array.isArray(parsed) ? parsed.map(normalizeStoredTab) : [];
    } catch (err) {
      console.error('Failed to read local saved tabs', err);
      return [];
    }
  };

  const writeLocalTabs = (tabsToWrite: CodeTab[]) => {
    if (Platform.OS !== 'web') return;

    try {
      localStorage.setItem('saved_tabs', JSON.stringify(tabsToWrite));
    } catch (err) {
      console.error('Failed to write local saved tabs', err);
    }
  };

  const fetchDbTabs = async (token: string): Promise<CodeTab[]> => {
    const res = await fetch(`${API_BASE_URL}/auth/tabs`, {
      headers: getApiHeaders(token),
    });

    if (res.status === 401) {
      await clearAuthToken();
      setIsLoggedIn(false);
      loadedSessionKeyRef.current = null;
      throw new Error('Your login expired. Please sign in again.');
    }

    if (!res.ok) {
      throw new Error(`Failed to load saved files (${res.status})`);
    }

    const data = await res.json();
    // Safely map incoming tabs to ensure each file has a stable UI id
    // while still preserving the Mongo _id for matching/deleting.
    if (Array.isArray(data)) {
      return data.map(normalizeStoredTab);
    }
    return [];
  };

  // --- Database Save Logic ---
  const handleSave = async () => {
    const tabsToSave = tabsRef.current;

    if (tabsToSave.length > 15) {
      setOutput('Save failed: maximum of 15 tabs allowed.');
      return;
    }

    const byteSize = (str: string) => new TextEncoder().encode(str).length;
    const MAX_TAB_SIZE = 1 * 1024 * 1024;
    const oversized = tabsToSave.find(t => byteSize(JSON.stringify(t)) > MAX_TAB_SIZE);
    if (oversized) {
      setOutput(`Save failed: "${oversized.name}" exceeds the 1MB size limit.`);
      return;
    }

    const cleanTabs = tabsToSave.map(t => ({ ...t, isDirty: false }));
    const token = await getAuthToken();

    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/tabs`, {
          method: 'POST',
          headers: getApiHeaders(token, true),
          body: JSON.stringify({ tabs: cleanTabs })
        });

        if (res.status === 401) {
          await clearAuthToken();
          setIsLoggedIn(false);
          loadedSessionKeyRef.current = null;
          throw new Error('Your login expired. Please sign in again.');
        }

        if (!res.ok) throw new Error(`Failed to save to database (${res.status})`);
      } catch (err) {
        console.error(err);
        return;
      }
    } else if (Platform.OS === 'web') {
      writeLocalTabs(cleanTabs);
    }

    setTabs(prev => prev.map(pt => {
      const saved = tabsToSave.find(st => st.id === pt.id);
      if (saved && saved.code === pt.code) {
        return { ...pt, isDirty: false };
      }
      return pt;
    }));
  };

  // Auto-Save Interval (10 Seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (tabsRef.current.some(t => t.isDirty)) {
        handleSave();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- Load Initial Session ---
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadSession = async () => {
        const token = await getAuthToken();

        if (cancelled) return;

        if (token) {
          setIsLoggedIn(true);

          const sessionKey = `auth:${token}`;
          if (loadedSessionKeyRef.current === sessionKey) return;
          loadedSessionKeyRef.current = sessionKey;

          try {
            const data = await fetchDbTabs(token);
            if (cancelled) return;

            setDbFiles(data);
            if (data.length > 0) {
              setTabs(data);
              setActiveTabId(data[0].id);
            } else {
              setTabs(DEFAULT_TABS);
              setActiveTabId(DEFAULT_TABS[0].id);
            }
          } catch (err) {
            console.log('Error loading tabs from DB (ignored internally)', err);
          }

          return;
        }

        setIsLoggedIn(false);

        if (Platform.OS === 'web' && loadedSessionKeyRef.current !== 'guest:web') {
          loadedSessionKeyRef.current = 'guest:web';
          const localTabs = readLocalTabs();
          if (localTabs.length > 0) {
            setTabs(localTabs);
            setActiveTabId(localTabs[0].id);
          }
        }
      };

      loadSession();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleLogout = async () => {
    await clearAuthToken();
    setIsLoggedIn(false);
    loadedSessionKeyRef.current = null;
    setDbFiles([]);
    setTabs(DEFAULT_TABS);
    setActiveTabId(DEFAULT_TABS[0].id);
  };

  // --- Load Saved Files Logic ---
  const handleOpenLoadMenu = async () => {
    if (showLoadMenu) {
      setShowLoadMenu(false);
      return;
    }

    const token = await getAuthToken();

    if (token) {
      setIsLoggedIn(true);
      try {
        const data = await fetchDbTabs(token);
        setDbFiles(data);
      } catch (err) {
        console.log('Failed to load DB files', err);
        setDbFiles([]);
      }
    } else if (Platform.OS === 'web') {
      setDbFiles(readLocalTabs());
    } else {
      setDbFiles([]);
    }

    setShowLoadMenu(true);
  };

  const handleSelectDbFile = (file: CodeTab) => {
    setShowLoadMenu(false);
    const targetId = file.id;

    setTabs(prev => {
      const exists = prev.find(t => t.id === targetId);
      if (!exists) {
        return [...prev, file];
      }
      return prev.map(t => t.id === targetId ? { ...t, code: file.code, isDirty: false } : t);
    });
    
    setActiveTabId(targetId);
  };

  const handleDeleteFile = async (file: CodeTab) => {
    const idsToRemove = getTabIdentifiers(file);
    if (idsToRemove.length === 0) return;

    const previousDbFiles = dbFiles;
    const previousOpenTabs = tabsRef.current;
    const previousActiveTabId = activeTabId;
    const previousLocalTabs = Platform.OS === 'web' ? readLocalTabs() : [];

    const nextDbFiles = previousDbFiles.filter(savedFile => !tabMatchesIdentifiers(savedFile, idsToRemove));
    const deletedFileName = file.name || 'file';

    // 1. Remove from the load menu immediately and close the menu.
    setDbFiles(nextDbFiles);
    setShowLoadMenu(false);

    // 2. Close the tab if this saved file is currently open.
    const deletedOpenTabIndex = previousOpenTabs.findIndex(tab => tabMatchesIdentifiers(tab, idsToRemove));
    const nextOpenTabsWithoutDeleted = previousOpenTabs.filter(tab => !tabMatchesIdentifiers(tab, idsToRemove));

    if (deletedOpenTabIndex !== -1) {
      const nextOpenTabs = nextOpenTabsWithoutDeleted.length > 0 ? nextOpenTabsWithoutDeleted : DEFAULT_TABS;
      const shouldMoveActiveTab = idsToRemove.includes(previousActiveTabId) || !nextOpenTabs.some(tab => tab.id === previousActiveTabId);
      const nextActiveTab = shouldMoveActiveTab
        ? nextOpenTabs[Math.min(deletedOpenTabIndex, nextOpenTabs.length - 1)]
        : nextOpenTabs.find(tab => tab.id === previousActiveTabId) || nextOpenTabs[0];

      setTabs(nextOpenTabs);
      setActiveTabId(nextActiveTab.id);
    }

    // 3. Delete from localStorage on web. This runs even when logged in, because
    // the same file may also exist in local saved_tabs from a previous session.
    if (Platform.OS === 'web') {
      writeLocalTabs(previousLocalTabs.filter(localFile => !tabMatchesIdentifiers(localFile, idsToRemove)));
    }

    // 4. Delete from MongoDB by saving the remaining saved files back to the server.
    // This matches the existing save/load API shape in this file: GET/POST /auth/tabs.
    // It avoids the broken DELETE /auth/tabs/:id path that was returning 404.
    const token = await getAuthToken();
    if (!token) return;

    try {
      const cleanTabs = nextDbFiles.map(tab => ({ ...tab, isDirty: false }));
      const res = await fetch(`${API_BASE_URL}/auth/tabs`, {
        method: 'POST',
        headers: getApiHeaders(token, true),
        body: JSON.stringify({ tabs: cleanTabs }),
      });

      if (res.status === 401) {
        await clearAuthToken();
        setIsLoggedIn(false);
        loadedSessionKeyRef.current = null;
        throw new Error('Your login expired. Please sign in again.');
      }

      if (!res.ok) {
        throw new Error(`Failed to delete from DB (${res.status})`);
      }

      setOutput(`Deleted "${deletedFileName}".`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete from DB.';
      setOutput(message);

      // Roll back visible state and localStorage if the DB update fails, so the UI
      // does not claim the file was deleted while MongoDB still has it.
      setDbFiles(previousDbFiles);
      setTabs(previousOpenTabs);
      setActiveTabId(previousActiveTabId);
      if (Platform.OS === 'web') {
        writeLocalTabs(previousLocalTabs);
      }
    }
  };

  // --- IDE Logic ---
  const setCode = (newCode: string) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, code: newCode, isDirty: true } : t));
  };

  const toggleWindow = (key: keyof typeof minimized) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMinimized(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (Platform.OS === 'web') {
        Cookies.set('theme', next ? 'dark' : 'light', { expires: 365 });
      }
      return next;
    });
  };

  const updateMemory = () => setMemoryData(getMemoryRange(0x10010000, 20));

  const refreshUI = (state: any) => {
    if (!state) return;
    if (state.registers) setRegisters(state.registers);
    if (state.output !== undefined) setOutput(state.output);
    setIsWaiting(state.isWaiting || false);
    updateMemory();
  };

  const handleSendInput = () => {
    if (!consoleInput.trim()) return;
    const input = consoleInput;
    setConsoleInput('');
    const state = feedInput(input);
    refreshUI(state);
  };

  const handleTabPress = (tabId: string) => {
    const now = Date.now();
    if (lastTapRef.current?.id === tabId && (now - lastTapRef.current.time) < 300) {
      const currentName = tabs.find(t => t.id === tabId)?.name || '';
      setActiveTabId(tabId);
      setEditTabName(currentName);
      setEditingTabId(tabId);
      lastTapRef.current = null;
    } else {
      setActiveTabId(tabId);
      lastTapRef.current = { id: tabId, time: now };
    }
  };

  useEffect(() => {
    if (!editingTabId) return;

    const timer = setTimeout(() => {
      renameInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [editingTabId]);

  const handleAddTab = () => {
    const newId = String(Date.now());
    const newName = `file${tabs.length + 1}.asm`;
    setTabs(prev => [...prev, { id: newId, name: newName, code: '', isDirty: true }]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) return; 
    const idx = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      const nextTab = newTabs[Math.min(idx, newTabs.length - 1)];
      setActiveTabId(nextTab.id);
    }
  };

  const handleDownload = async () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    if (Platform.OS === 'web') {
      const blob = new Blob([activeTab.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeTab.name;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        const fileUri = FileSystem.cacheDirectory + activeTab.name;
        await FileSystem.writeAsStringAsync(fileUri, activeTab.code, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: `Save ${activeTab.name}`,
          });
        }
      } catch (err) {
        console.log('Download failed:', err);
      }
    }
  };

  const handleUpload = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.asm,.s,.txt';
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          const newId = String(Date.now());
          setTabs(prev => [...prev, { id: newId, name: file.name, code: text, isDirty: true }]);
          setActiveTabId(newId);
        };
        reader.readAsText(file);
      };
      input.click();
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        const text = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const newId = String(Date.now());
        setTabs(prev => [...prev, { id: newId, name: asset.name ?? 'uploaded.asm', code: text, isDirty: true }]);
        setActiveTabId(newId);
      } catch (err) {
        console.log('Upload failed:', err);
      }
    }
  };

  const handleCommitTabName = () => {
    if (editingTabId && editTabName.trim()) {
      setTabs(prev => prev.map(t => t.id === editingTabId ? { ...t, name: editTabName.trim(), isDirty: true } : t));
    }
    setEditingTabId(null);
  };

  const editorActions = useMemo(() => [
    { label: 'Assemble', symbol: '🔨', onPress: () => {
        const r = assemble(activeCode);
        if (!r.ok) setOutput(`Assembly error:\n${r.error}`);
        else {
          setActiveLine(null);
          refreshUI(getState());
          setOutput('Assembled successfully.');
        }
    }},
    { label: 'Run', symbol: '▶', onPress: () => {
        const state = runSim();
        if (state && 'error' in state) {
          setOutput(`Runtime error:\n${state.error}`);
          setIsWaiting(false);
        } else {
          refreshUI(state);
        }
    }},
    { label: 'Step', symbol: '⏭', onPress: () => {
        const state = stepSim();
        if (state && 'error' in state) {
          setOutput(`Step error:\n${state.error}`);
          setIsWaiting(false);
        } else {
          refreshUI(state);
          if (state && state.pc !== undefined) {
            const line = state.lineNumber ?? null;
            setActiveLine(line);

            setOutput(
              `PC: 0x${state.pc.toString(16).padStart(8, '0')}\n` +
              (state.output || '')
            );
          }
        }
    }},
    { label: 'Reset', symbol: '↻', onPress: () => {
        resetSim(); 
        setActiveLine(null);
        setRegisters(buildInitialRegisters()); 
        setOutput('Reset.');
        setIsWaiting(false);
        setMemoryData([]);
    }},
  ], [activeCode, consoleInput]);

  // --- Desktop Resizer Handlers ---
  const panResponderHorizontal = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => setIsResizing(true),
    onPanResponderMove: (_, gs) => {
      const newPct = ((gs.moveX - 16) / (width - 32)) * 100;
      if (newPct > 10 && newPct < 90) setLeftPanelPct(newPct);
    },
    onPanResponderRelease: () => setIsResizing(false),
  }), [width]);

  const panResponderVertical = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsResizing(true);
      editorColumnRef.current?.measureInWindow((x, y, w, h) => { editorColumnLayout.current = { y, height: h }; });
    },
    onPanResponderMove: (_, gs) => {
      const { y: colY, height: colH } = editorColumnLayout.current;
      const newPct = ((gs.moveY - colY) / colH) * 100;
      if (newPct > 15 && newPct < 85) setEditorHeightPct(newPct);
    },
    onPanResponderRelease: () => setIsResizing(false),
  }), []);

  const panResponderSideVertical = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsResizing(true);
      sideColumnRef.current?.measureInWindow((x, y, w, h) => { sideColumnLayout.current = { y, height: h }; });
    },
    onPanResponderMove: (_, gs) => {
      const { y: colY, height: colH } = sideColumnLayout.current;
      const newPct = ((gs.moveY - colY) / colH) * 100;
      if (newPct > 15 && newPct < 85) setSideHeightPct(newPct);
    },
    onPanResponderRelease: () => setIsResizing(false),
  }), []);

  // --- Dropdown Menu Renderers ---
  const renderLoadMenu = (isDesktop: boolean) => {
    if (!showLoadMenu) return null;
    return (
      <View style={[styles.loadDropdownMenu, isDesktop ? styles.loadDropdownDesktop : styles.loadDropdownMobile, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
        <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="always">
          {dbFiles.length === 0 ? (
            <Text style={{ padding: 12, color: activeTheme.subText, fontStyle: 'italic' }}>No saved files.</Text>
          ) : (
            dbFiles.map(file => (
              <View key={file.id} style={[styles.dropdownItem, { borderBottomColor: activeTheme.border }]}>
                <TouchableOpacity
                  style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14 }}
                  onPressIn={() => handleSelectDbFile(file)}
                  delayPressIn={0}
                >
                  <Text style={{ color: activeTheme.text }} numberOfLines={1}>{file.name}</Text>
                </TouchableOpacity>
                {(isLoggedIn || Platform.OS === 'web') && (
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 16, paddingVertical: 14 }} 
                    onPress={() => handleDeleteFile(file)}
                  >
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // --- Shared Tab ScrollView ---
  const renderTabScrollView = () => (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'} style={{ flex: 1 }}>
        {tabs.map((tab) => (
          <View key={tab.id} style={[styles.editorTab, { borderColor: activeTabId === tab.id ? '#3b82f6' : 'transparent' }]}>
            {editingTabId === tab.id ? (
              <TextInput
                ref={renameInputRef}
                autoFocus
                selectTextOnFocus
                value={editTabName}
                onChangeText={setEditTabName}
                onBlur={handleCommitTabName}
                onSubmitEditing={handleCommitTabName}
                placeholderTextColor={activeTheme.subText}
                selectionColor="#60a5fa"
                cursorColor="#60a5fa"
                style={[
                  styles.renameInput,
                  {
                    color: activeTheme.text,
                    backgroundColor: activeTheme.card,
                    borderColor: activeTheme.border,
                  },
                ]}
              />
            ) : (
              <TouchableOpacity onPress={() => handleTabPress(tab.id)}>
                <Text style={{
                  color: activeTabId === tab.id ? activeTheme.text : activeTheme.subText,
                  fontWeight: activeTabId === tab.id ? '600' : '400',
                  marginRight: tabs.length > 1 ? 4 : 8,
                }}>
                  {tab.name}{isLoggedIn && tab.isDirty ? '*' : ''}
                </Text>
              </TouchableOpacity>
            )}
            {tabs.length > 1 && (
              <TouchableOpacity onPress={() => handleCloseTab(tab.id)} style={styles.tabCloseBtn}>
                <Text style={{ color: activeTheme.subText, fontSize: 12, lineHeight: 14 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // --- Desktop Tab Bar ---
  const renderDesktopTabBar = () => (
    <View style={[styles.editorTabBar, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
      {renderTabScrollView()}
      <View style={styles.desktopTabActions}>
        
        {isLoggedIn && (
          <>
            <TouchableOpacity onPress={handleSave} style={[styles.desktopFileBtn, { borderColor: activeTheme.border }]}>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: activeTheme.text, fontSize: 16 }}>💾</Text>
              </View>
            </TouchableOpacity>
            
            <View style={{ position: 'relative', zIndex: 100 }}>
              <TouchableOpacity onPress={handleOpenLoadMenu} style={[styles.desktopFileBtn, { borderColor: activeTheme.border }]}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: activeTheme.text, fontSize: 16 }}>📂</Text>
                </View>
              </TouchableOpacity>
              {renderLoadMenu(true)}
            </View>
          </>
        )}

        <TouchableOpacity onPress={handleUpload} style={[styles.desktopFileBtn, { borderColor: activeTheme.border }]}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: activeTheme.text, fontWeight: '700', fontSize: 16, lineHeight: 16, transform: [{ translateY: 2 }] }}>↑</Text>
            <View style={{ width: 14, height: 4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: activeTheme.text, marginTop: 2 }} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDownload} style={[styles.desktopFileBtn, { borderColor: activeTheme.border }]}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: activeTheme.text, fontWeight: '700', fontSize: 16, lineHeight: 16, transform: [{ translateY: 2 }] }}>↓</Text>
            <View style={{ width: 14, height: 4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: activeTheme.text, marginTop: 2 }} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAddTab} style={[styles.desktopFileBtn, styles.desktopFileBtnLast, { borderColor: activeTheme.border }]}>
          <Text style={{ color: activeTheme.text, fontSize: 18, fontWeight: '300', lineHeight: 22 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- Mobile Tab Bar ---
  const renderTabBar = () => (
    <View style={[styles.editorTabBar, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
      {renderTabScrollView()}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', flexShrink: 0, zIndex: 100 }}>
        {isLoggedIn && (
          <>
            <TouchableOpacity onPress={handleSave} style={[styles.tabActionBtn, { borderColor: activeTheme.border }]}>
              <Text style={{ color: activeTheme.text, fontSize: 16 }}>💾</Text>
            </TouchableOpacity>

            <View style={{ position: 'relative', zIndex: 100 }}>
              <TouchableOpacity onPress={handleOpenLoadMenu} style={[styles.tabActionBtn, { borderColor: activeTheme.border }]}>
                <Text style={{ color: activeTheme.text, fontSize: 16 }}>📂</Text>
              </TouchableOpacity>
              {renderLoadMenu(false)}
            </View>
          </>
        )}
        <TouchableOpacity onPress={handleAddTab} style={[styles.tabActionBtn, { borderColor: activeTheme.border }]}>
          <Text style={{ color: activeTheme.subText, fontSize: 16, fontWeight: '300' }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMobileFileActions = () => (
    <View style={[styles.mobileFileActionsBar, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
      <TouchableOpacity onPress={handleUpload} style={[styles.mobileFileActionBtn, { borderColor: activeTheme.border }]}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: activeTheme.text, fontWeight: '700', fontSize: 16, lineHeight: 16, transform: [{ translateY: 2 }] }}>↑</Text>
          <View style={{ width: 14, height: 4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: activeTheme.text, marginTop: 2 }} />
        </View>
        <Text style={[styles.mobileFileActionLabel, { color: activeTheme.subText }]}>Upload</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDownload} style={[styles.mobileFileActionBtn, { borderColor: activeTheme.border, borderLeftWidth: 0 }]}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: activeTheme.text, fontWeight: '700', fontSize: 16, lineHeight: 16, transform: [{ translateY: 2 }] }}>↓</Text>
          <View style={{ width: 14, height: 4, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: activeTheme.text, marginTop: 2 }} />
        </View>
        <Text style={[styles.mobileFileActionLabel, { color: activeTheme.subText }]}>Download</Text>
      </TouchableOpacity>
    </View>
  );

  const LogoutSymbol = ({ color = '#ffffff' }: { color?: string }) => (
    <View style={{ width: 24, height: 18, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ position: 'absolute', right: 4, width: 12, height: 18, borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: color }} />
      <View style={{ position: 'absolute', right: 16, top: 0, width: 2, height: 5, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: 16, bottom: 0, width: 2, height: 5, backgroundColor: color }} />
      <Text style={{ position: 'absolute', right: 8, transform: [{ translateY: -2 }], color: color, fontWeight: '700', fontSize: 16, lineHeight: 18 }}>←</Text>
    </View>
  );

  return (
    <PageWrapper>
      <SafeAreaView style={[tStyles.safeArea, isResizing && styles.noSelect]}>
        <StatusBar barStyle={activeTheme.statusBarStyle as any} />
        
        {showLoadMenu && (
          <TouchableOpacity 
            style={[StyleSheet.absoluteFill, { zIndex: 90 }]} 
            activeOpacity={1} 
            onPress={() => setShowLoadMenu(false)} 
          />
        )}

        <View style={tStyles.container}>

          {/* TOP BAR */}
          <View style={styles.topBar}>
            <Image source={isDarkMode ? require('../../assets/images/WIMPS_dark.png') : require('../../assets/images/WIMPS_light.png')} style={styles.logo} />
            
            {isWide && (
              <View style={styles.minimizedTray}>
                {minimized.editor && minimized.console && <DesktopMinimizedTab label="Editor & Console" isDarkMode={isDarkMode} onPress={() => setMinimized(p => ({ ...p, editor: false, console: false }))} />}
                {minimized.registers && minimized.memory && <DesktopMinimizedTab label="Registers & Memory" isDarkMode={isDarkMode} onPress={() => setMinimized(p => ({ ...p, registers: false, memory: false }))} />}
              </View>
            )}

            <View style={styles.topBarActions}>
              <View style={{ marginRight: isWide ? 0 : 8 }}>
                <ThemeSwitch isDark={isDarkMode} toggle={toggleTheme} />
              </View>
              {isWide ? (
                <>
                  <TouchableOpacity style={tStyles.secondaryButton} onPress={() => router.push('/docs')}>
                    <Text style={tStyles.secondaryButtonText}>Docs</Text>
                  </TouchableOpacity>
                  {isLoggedIn ? (
                    <TouchableOpacity style={[styles.primaryButton, { paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' }]} onPress={handleLogout}>
                      <LogoutSymbol color="#ffffff" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
                      <Text style={styles.primaryButtonText}>Login</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.menuIcon}>
                  <Text style={{ color: activeTheme.text, fontSize: 28, fontWeight: '300' }}>☰</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isWide ? (
            /* --- DESKTOP VIEW --- */
            <View style={styles.desktopContent}>
              {(!minimized.editor || !minimized.console) && (
                <View ref={editorColumnRef} style={[styles.editorColumn, { width: (minimized.registers && minimized.memory) ? '100%' : `${leftPanelPct}%`, zIndex: 100 }]}>
                  <WindowWrapper 
                    title="MIPS Editor" 
                    theme={activeTheme} 
                    isMinimized={minimized.editor} 
                    onToggleMinimize={() => toggleWindow('editor')} 
                    style={[
                      !minimized.editor ? { height: minimized.console ? 'calc(100% - 24px)' : `${editorHeightPct}%` } : { height: 40 },
                      { overflow: 'visible', zIndex: 100 }
                    ]}
                  >
                    {!minimized.editor && renderDesktopTabBar()}
                    <CodeEditor
                      code={activeCode}
                      setCode={setCode}
                      actions={editorActions}
                      theme={activeTheme}
                      activeLine={activeLine}
                    />
                  </WindowWrapper>

                  {!minimized.editor && !minimized.console && (
                    <View {...panResponderVertical.panHandlers} style={styles.resizerHorizontal}><View style={tStyles.resizerHorizontalLine} /></View>
                  )}

                  <WindowWrapper 
                    title="Console Output" 
                    theme={activeTheme} 
                    isMinimized={minimized.console} 
                    onToggleMinimize={() => toggleWindow('console')} 
                    style={!minimized.console ? { height: minimized.editor ? '100%' : `${100 - editorHeightPct}%` } : { height: 40 }}
                  >
                    <View style={{ flex: 1, backgroundColor: activeTheme.card }}>
                      <ScrollView style={{ flex: 1, padding: 14 }}>
                        <Text style={tStyles.consoleText}>{output}</Text>
                        {isWaiting && <Text style={{ color: '#2563eb', fontWeight: 'bold', marginTop: 8 }}>[WAITING FOR INPUT...]</Text>}
                      </ScrollView>
                      <View style={[styles.consoleInputBar, { borderColor: activeTheme.border }]}>
                        <Text style={{ color: activeTheme.subText, fontFamily: 'monospace', marginRight: 4 }}>$</Text>
                        <TextInput
                          style={{ flex: 1, color: activeTheme.text, fontFamily: 'monospace' }}
                          value={consoleInput}
                          onChangeText={setConsoleInput}
                          placeholder="Type input here..."
                          placeholderTextColor={activeTheme.subText}
                          onSubmitEditing={handleSendInput}
                          blurOnSubmit={false}
                        />
                      </View>
                    </View>
                  </WindowWrapper>
                </View>
              )}

              {(!minimized.editor || !minimized.console) && (!minimized.registers || !minimized.memory) && (
                <View {...panResponderHorizontal.panHandlers} style={styles.resizerVertical}><View style={tStyles.resizerVerticalLine} /></View>
              )}

              {(!minimized.registers || !minimized.memory) && (
                <View ref={sideColumnRef} style={[styles.sideColumn, { width: (minimized.editor && minimized.console) ? '100%' : `${100 - leftPanelPct}%` }]}>
                  <WindowWrapper title="Registers" theme={activeTheme} isMinimized={minimized.registers} onToggleMinimize={() => toggleWindow('registers')} style={!minimized.registers ? { height: minimized.memory ? 'calc(100% - 24px)' : `${sideHeightPct}%` } : { height: 40 }}>
                    <RegisterPanel registers={registers} theme={activeTheme} showHex={showHex} toggleFormat={() => setShowHex(p => !p)} />
                  </WindowWrapper>
                  {!minimized.registers && !minimized.memory && (
                    <View {...panResponderSideVertical.panHandlers} style={styles.resizerHorizontal}><View style={tStyles.resizerHorizontalLine} /></View>
                  )}
                  <WindowWrapper title="Memory View" theme={activeTheme} isMinimized={minimized.memory} onToggleMinimize={() => toggleWindow('memory')} style={!minimized.memory ? { height: minimized.registers ? '100%' : `${100 - sideHeightPct}%` } : { height: 40 }}>
                    <MemoryView data={memoryData} theme={activeTheme} />
                  </WindowWrapper>
                </View>
              )}
            </View>
          ) : (
            /* --- MOBILE VIEW --- */
            <View style={styles.mobileContent}>
              <View style={styles.mobileMainArea}>
                {mobileView === 'editor' && (
                  <WindowWrapper title="Editor" theme={activeTheme} isMinimized={false} onToggleMinimize={null} style={{ height: '100%', overflow: 'visible', zIndex: 100 }}>
                    {renderMobileFileActions()}
                    {renderTabBar()}
                    <CodeEditor
                      code={activeCode}
                      setCode={setCode}
                      actions={editorActions}
                      theme={activeTheme}
                      activeLine={activeLine}
                    />
                  </WindowWrapper>
                )}
                {mobileView === 'console' && (
                  <WindowWrapper title="Console" theme={activeTheme} isMinimized={false} onToggleMinimize={null} style={{ height: '100%' }}>
                    <View style={{ flex: 1, backgroundColor: activeTheme.card }}>
                      <ScrollView style={{ flex: 1, padding: 14 }}>
                        <Text style={tStyles.consoleText}>{output}</Text>
                        {isWaiting && <Text style={{ color: '#2563eb', fontWeight: 'bold', marginTop: 8 }}>[WAITING FOR INPUT...]</Text>}
                      </ScrollView>
                      <View style={[styles.consoleInputBar, { borderColor: activeTheme.border }]}>
                        <Text style={{ color: activeTheme.subText, fontFamily: 'monospace', marginRight: 4 }}>$</Text>
                        <TextInput
                          style={{ flex: 1, color: activeTheme.text, fontFamily: 'monospace' }}
                          value={consoleInput}
                          onChangeText={setConsoleInput}
                          placeholder="Type input here..."
                          placeholderTextColor={activeTheme.subText}
                          onSubmitEditing={handleSendInput}
                          blurOnSubmit={false}
                        />
                        <TouchableOpacity onPress={handleSendInput}><Text style={{ color: '#2563eb', fontWeight: '700', marginLeft: 8 }}>SEND</Text></TouchableOpacity>
                      </View>
                    </View>
                  </WindowWrapper>
                )}
                {mobileView === 'registers' && (
                  <WindowWrapper title="Registers" theme={activeTheme} isMinimized={false} onToggleMinimize={null} style={{ height: '100%' }}>
                    <RegisterPanel registers={registers} theme={activeTheme} showHex={showHex} toggleFormat={() => setShowHex(p => !p)} />
                  </WindowWrapper>
                )}
                {mobileView === 'memory' && (
                  <WindowWrapper title="Memory" theme={activeTheme} isMinimized={false} onToggleMinimize={null} style={{ height: '100%' }}>
                    <MemoryView data={memoryData} theme={activeTheme} />
                  </WindowWrapper>
                )}
              </View>
              <View style={[styles.mobileTabBar, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
                  {(['editor', 'console', 'registers', 'memory'] as const).map((view) => (
                    <TouchableOpacity 
                      key={view} 
                      onPress={() => setMobileView(view)} 
                      style={[styles.mobileTabButton, mobileView === view && { borderTopWidth: 3, borderTopColor: '#2563eb' }]}
                    >
                      <Text style={{ color: mobileView === view ? '#2563eb' : activeTheme.subText, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                        {view}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
            </View>
          )}

          {/* MOBILE MENU - Moved to bottom of the DOM for strict Android Z-Index ordering */}
          {menuOpen && !isWide && (
            <View style={[styles.mobileMenu, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { router.push('/docs'); setMenuOpen(false); }}>
                <Text style={{ color: activeTheme.text }}>Docs</Text>
              </TouchableOpacity>
              {isLoggedIn ? (
                <TouchableOpacity style={styles.menuItem} onPress={() => { handleLogout(); setMenuOpen(false); }}>
                  <Text style={{ color: activeTheme.text }}>Logout</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.menuItem} onPress={() => { router.push('/login'); setMenuOpen(false); }}>
                  <Text style={{ color: activeTheme.text }}>Login</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </View>
      </SafeAreaView>
    </PageWrapper>
  );
}

const getThemeStyles = (theme: Theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, zIndex: 100 },
  secondaryButton: { borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.btnBg },
  secondaryButtonText: { color: theme.text, fontWeight: '600' },
  consoleCard: { flex: 1, backgroundColor: theme.card, padding: 14 },
  consoleText: { color: theme.consoleText, fontFamily: 'monospace', lineHeight: 20 },
  resizerVerticalLine: { width: 4, height: 40, backgroundColor: theme.resizer, borderRadius: 2 },
  resizerHorizontalLine: { height: 4, width: 40, backgroundColor: theme.resizer, borderRadius: 2 },
});

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  logo: { width: 160, height: 40, resizeMode: 'contain' },
  minimizedTray: { flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 11, fontWeight: '700' },
  topBarActions: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  primaryButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  primaryButtonText: { color: '#ffffff', fontWeight: '600' },
  desktopContent: { flex: 1, flexDirection: 'row' },
  editorColumn: { height: '100%', paddingRight: 4, paddingBottom: 12, zIndex: 100 },
  sideColumn: { height: '100%', paddingLeft: 4 },
  resizerVertical: { width: 16, justifyContent: 'center', alignItems: 'center', cursor: 'col-resize' as any },
  resizerHorizontal: { height: 16, justifyContent: 'center', alignItems: 'center', cursor: 'row-resize' as any, zIndex: 10 },
  mobileContent: { flex: 1, flexDirection: 'column' },
  mobileMainArea: { flex: 1, zIndex: 100 },
  mobileTabBar: { flexDirection: 'row', height: 60, borderTopWidth: 1 },
  mobileTabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  menuIcon: { padding: 4 },
  
  // Elevated mobile menu
  mobileMenu: { 
    position: 'absolute', 
    top: 60, 
    right: 16, 
    width: 140, 
    borderRadius: 10, 
    borderWidth: 1, 
    zIndex: 1000, 
    elevation: 100, // Explicitly float over children
    padding: 8 
  },
  menuItem: { padding: 12 },
  
  editorTabBar: { flexDirection: 'row', borderBottomWidth: 1, alignItems: 'center', zIndex: 100 },
  editorTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2, flexShrink: 0 },
  renameInput: {
    minWidth: 90,
    maxWidth: 220,
    height: 24,
    paddingHorizontal: 6,
    paddingVertical: 0,
    marginRight: 4,
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tabCloseBtn: { paddingHorizontal: 4, paddingVertical: 2, marginLeft: 2 },
  tabActionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderLeftWidth: 1, justifyContent: 'center', alignItems: 'center' },
  noSelect: { userSelect: 'none' } as any,
  switchTrack: { width: 58, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  switchIcon: { fontSize: 12, fontWeight: 'bold' },
  
  desktopTabActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexShrink: 0,
    zIndex: 100,
  },
  desktopFileBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderLeftWidth: 1,
    gap: 0,
    height: '100%',
  },
  desktopFileBtnLast: {
    paddingHorizontal: 13,
  },
  
  mobileFileActionsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
    zIndex: 100,
  },
  mobileFileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  mobileFileActionIcon: {
    fontSize: 13,
  },
  mobileFileActionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Elevated load dropdowns
  loadDropdownMenu: {
    position: 'absolute',
    top: '100%',
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 9999, 
    elevation: 100, // Explicitly float over children
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  loadDropdownDesktop: {
    right: 0,
    width: 200,
    marginTop: 4,
  },
  loadDropdownMobile: {
    right: 0,
    width: 180,
    marginTop: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  consoleInputBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    borderTopWidth: 1, 
    backgroundColor: 'rgba(0,0,0,0.03)' 
  },
});