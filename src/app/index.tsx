import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';

import Cookies from 'js-cookie';

import { CodeEditor } from '../components/CodeEditor';
import { MemoryView } from '../components/MemoryView';
import { RegisterPanel, RegisterValue } from '../components/RegisterPanel';
import { WindowWrapper } from '../components/WindowWrapper';
import { assemble, getMemoryRange, getState, resetSim, runSim, stepSim } from '../simulator/useMips';

import { PageWrapper } from '@/components/PageWrapper';
import type { Theme } from '../theme/themes';
import { THEMES } from '../theme/themes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
}

export default function IdeScreen() {
  const { height, width } = useWindowDimensions();
  const isWide = width >= 1000;

  // --- State ---
  const [tabs, setTabs] = useState<CodeTab[]>([{ id: '1', name: 'file1.asm', code: '' }]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTabName, setEditTabName] = useState<string>('');
  const [mobileView, setMobileView] = useState<'editor' | 'console' | 'registers' | 'memory'>('editor');
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [registers, setRegisters] = useState<RegisterValue[]>(buildInitialRegisters());
  const [output, setOutput] = useState('Program output will appear here.');
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showHex, setShowHex] = useState(true);

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
  const editorColumnRef = useRef<View>(null);
  const editorColumnLayout = useRef({ y: 0, height: 0 });
  const sideColumnRef = useRef<View>(null);
  const sideColumnLayout = useRef({ y: 0, height: 0 });

  const activeCode = useMemo(() => tabs.find(t => t.id === activeTabId)?.code || '', [tabs, activeTabId]);
  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);

  // --- Logic ---
  const setCode = (newCode: string) => setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, code: newCode } : t));
  const toggleWindow = (key: keyof typeof minimized) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMinimized(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      Cookies.set('theme', next ? 'dark' : 'light', { expires: 365 });
      return next;
    });
  };
  const updateMemory = () => setMemoryData(getMemoryRange(0x10010000, 20));

  const handleTabPress = (tabId: string) => {
    const now = Date.now();
    if (lastTapRef.current?.id === tabId && (now - lastTapRef.current.time) < 300) {
      setEditingTabId(tabId);
      setEditTabName(tabs.find(t => t.id === tabId)?.name || '');
    } else {
      setActiveTabId(tabId);
      lastTapRef.current = { id: tabId, time: now };
    }
  };

  const editorActions = useMemo(() => [
    { label: 'Assemble', icon: require('../../assets/images/assemble_icon.png'), onPress: () => {
        const r = assemble(activeCode);
        if (!r.ok) setOutput(`Assembly error:\n${r.error}`);
        else { setRegisters(getState()?.registers || []); updateMemory(); setOutput('Assembled successfully.'); }
    }},
    { label: 'Run', icon: require('../../assets/images/run_icon.png'), onPress: () => {
        const r = runSim();
        if ('error' in r) setOutput(`Runtime error:\n${r.error}`);
        else { setRegisters(r.registers); updateMemory(); setOutput(r.output || 'Program finished.'); }
    }},
    { label: 'Step', icon: require('../../assets/images/step_icon.png'), onPress: () => {
        const r = stepSim();
        if ('error' in r) setOutput(`Step error:\n${r.error}`);
        else { setRegisters(r.registers); updateMemory(); setOutput(`PC: 0x${r.pc.toString(16).padStart(8, '0')}\n` + r.output); }
    }},
    { label: 'Reset', icon: require('../../assets/images/reset_icon.png'), onPress: () => {
        resetSim(); setRegisters(buildInitialRegisters()); setOutput('Reset.');
    }},
  ], [activeCode]);

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

  return (
    <PageWrapper>
      <SafeAreaView style={[tStyles.safeArea, isResizing && styles.noSelect]}>
        <StatusBar barStyle={activeTheme.statusBarStyle as any} />
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
                  <TouchableOpacity style={tStyles.secondaryButton} onPress={() => window.open('/docs', '_self')}><Text style={tStyles.secondaryButtonText}>Docs</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => window.open('/login', '_self')}><Text style={styles.primaryButtonText}>Login</Text></TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.menuIcon}>
                  <Text style={{ color: activeTheme.text, fontSize: 28, fontWeight: '300' }}>☰</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* MOBILE MENU */}
          {menuOpen && !isWide && (
            <View style={[styles.mobileMenu, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => window.open('/docs', '_self')}><Text style={{ color: activeTheme.text }}>Docs</Text></TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => window.open('/login', '_self')}><Text style={{ color: activeTheme.text }}>Login</Text></TouchableOpacity>
            </View>
          )}

          {isWide ? (
            /* --- DESKTOP VIEW --- */
            <View style={styles.desktopContent}>
              {(!minimized.editor || !minimized.console) && (
                <View ref={editorColumnRef} style={[styles.editorColumn, { width: (minimized.registers && minimized.memory) ? '100%' : `${leftPanelPct}%` }]}>
                  <WindowWrapper 
                    title="MIPS Editor" 
                    theme={activeTheme} 
                    isMinimized={minimized.editor} 
                    onToggleMinimize={() => toggleWindow('editor')} 
                    style={!minimized.editor ? { height: minimized.console ? 'calc(100% - 24px)' : `${editorHeightPct}%` } : { height: 40 }}
                  >
                    {!minimized.editor && (
                      <View style={[styles.editorTabBar, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
                          {tabs.map((tab) => (
                            <View key={tab.id} style={[styles.editorTab, { borderColor: activeTabId === tab.id ? '#3b82f6' : 'transparent' }]}>
                              <TouchableOpacity onPress={() => handleTabPress(tab.id)}>
                                {editingTabId === tab.id ? (
                                  <TextInput autoFocus value={editTabName} onChangeText={setEditTabName} onBlur={() => setEditingTabId(null)} style={{ color: activeTheme.text, minWidth: 60 }} />
                                ) : (
                                  <Text style={{ color: activeTabId === tab.id ? activeTheme.text : activeTheme.subText, fontWeight: activeTabId === tab.id ? '600' : '400', marginRight: 8 }}>{tab.name}</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    <CodeEditor code={activeCode} setCode={setCode} actions={editorActions} theme={activeTheme} />
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
                    <View style={[tStyles.consoleCard, { flex: 1 }]}><ScrollView><Text style={tStyles.consoleText}>{output}</Text></ScrollView></View>
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
                  <WindowWrapper title="Editor" theme={activeTheme} isMinimized={false} onToggleMinimize={null} style={{ height: '100%' }}>
                    <CodeEditor code={activeCode} setCode={setCode} actions={editorActions} theme={activeTheme} />
                  </WindowWrapper>
                )}
                {mobileView === 'console' && (
                  <WindowWrapper title="Console" theme={activeTheme} isMinimized={false} onToggleMinimize={null} style={{ height: '100%' }}>
                    <View style={[tStyles.consoleCard, { flex: 1 }]}><ScrollView><Text style={tStyles.consoleText}>{output}</Text></ScrollView></View>
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
                  <TouchableOpacity key={view} onPress={() => setMobileView(view)} style={[styles.mobileTabButton, mobileView === view && { borderTopWidth: 3, borderTopColor: '#2563eb' }]}>
                    <Text style={{ color: mobileView === view ? '#2563eb' : activeTheme.subText, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{view}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </PageWrapper>
  );
}

const getThemeStyles = (theme: Theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
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
  editorColumn: { height: '100%', paddingRight: 4, paddingBottom: 12 },
  sideColumn: { height: '100%', paddingLeft: 4 },
  resizerVertical: { width: 16, justifyContent: 'center', alignItems: 'center', cursor: 'col-resize' as any },
  resizerHorizontal: { height: 16, justifyContent: 'center', alignItems: 'center', cursor: 'row-resize' as any, zIndex: 10 },
  mobileContent: { flex: 1, flexDirection: 'column' },
  mobileMainArea: { flex: 1 },
  mobileTabBar: { flexDirection: 'row', height: 60, borderTopWidth: 1 },
  mobileTabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  menuIcon: { padding: 4 },
  mobileMenu: { position: 'absolute', top: 60, right: 16, width: 140, borderRadius: 10, borderWidth: 1, zIndex: 100, padding: 8 },
  menuItem: { padding: 12 },
  editorTabBar: { flexDirection: 'row', borderBottomWidth: 1, alignItems: 'center' },
  editorTab: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2 },
  noSelect: { userSelect: 'none' } as any,
  switchTrack: { width: 58, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  switchIcon: { fontSize: 12, fontWeight: 'bold' },
});