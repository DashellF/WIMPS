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
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
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

const TabItem = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.tab} onPress={onPress}>
    <Text style={styles.tabText}>{label}</Text>
  </TouchableOpacity>
);

export default function IdeScreen() {
  const { height, width } = useWindowDimensions();
  const isWide = width >= 1000;

  const [code, setCode] = useState('');
  const [registers, setRegisters] = useState<RegisterValue[]>(buildInitialRegisters());
  const [output, setOutput] = useState('Program output will appear here.');
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showHex, setShowHex] = useState(true);

  // Layout Percentages
  const [leftPanelPct, setLeftPanelPct] = useState(70);
  const [editorHeightPct, setEditorHeightPct] = useState(65);
  // ✅ Split percentage for registers vs memory in the side column
  const [sideHeightPct, setSideHeightPct] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  const [minimized, setMinimized] = useState({
    editor: false,
    console: false,
    registers: false,
    memory: false,
  });

  // Refs for measuring column positions
  const editorColumnRef = useRef<View>(null);
  const editorColumnLayout = useRef({ y: 0, height: 0 });

  // ✅ Ref for the side column so we can resize registers/memory too
  const sideColumnRef = useRef<View>(null);
  const sideColumnLayout = useRef({ y: 0, height: 0 });

  const STORAGE_KEY = '@mips_editor_code';

  const toggleWindow = (key: keyof typeof minimized) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMinimized(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const maximizeWindow = (targetKey: keyof typeof minimized) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMinimized({
      editor: targetKey !== 'editor',
      console: targetKey !== 'console',
      registers: targetKey !== 'registers',
      memory: targetKey !== 'memory',
    });
  };

  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);

  const editorActions = useMemo(() => [
    {
      label: 'Assemble', icon: require('../../assets/images/assemble_icon.png'), onPress: () => {
        const result = assemble(code);
        if (!result.ok) setOutput(`Assembly error:\n${result.error}`);
        else { setRegisters(getState()?.registers || []); updateMemory(); setOutput('Assembled successfully.'); }
      }
    },
    {
      label: 'Run', icon: require('../../assets/images/run_icon.png'), onPress: () => {
        const result = runSim();
        if ('error' in result) setOutput(`Runtime error:\n${result.error}`);
        else { setRegisters(result.registers); updateMemory(); setOutput(result.output || 'Program finished.'); }
      }
    },
    {
      label: 'Step', icon: require('../../assets/images/step_icon.png'), onPress: () => {
        const result = stepSim();
        if ('error' in result) setOutput(`Step error:\n${result.error}`);
        else { setRegisters(result.registers); updateMemory(); setOutput(`PC: 0x${result.pc.toString(16).padStart(8, '0')}\n` + result.output); }
      }
    },
    {
      label: 'Reset', icon: require('../../assets/images/reset_icon.png'), onPress: () => {
        resetSim(); setRegisters(buildInitialRegisters()); setOutput('Reset.');
      }
    },
  ], [code]);

  const panResponderHorizontal = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => setIsResizing(true),
    onPanResponderMove: (_, gestureState) => {
      const newPct = ((gestureState.moveX - 16) / (width - 32)) * 100;
      if (newPct > 10 && newPct < 90) setLeftPanelPct(newPct);
    },
    onPanResponderRelease: () => setIsResizing(false),
  }), [width]);

  const panResponderVertical = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsResizing(true);
      editorColumnRef.current?.measureInWindow((x, y, w, h) => {
        editorColumnLayout.current = { y, height: h };
      });
    },
    onPanResponderMove: (_, gestureState) => {
      const { y: colY, height: colH } = editorColumnLayout.current;
      if (colH === 0) return;
      const relativeY = gestureState.moveY - colY;
      const newPct = (relativeY / colH) * 100;
      if (newPct > 15 && newPct < 85) setEditorHeightPct(newPct);
    },
    onPanResponderRelease: () => setIsResizing(false),
    onPanResponderTerminate: () => setIsResizing(false),
  }), []);

  // ✅ Vertical resizer for the side column (registers vs memory)
  const panResponderSideVertical = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsResizing(true);
      sideColumnRef.current?.measureInWindow((x, y, w, h) => {
        sideColumnLayout.current = { y, height: h };
      });
    },
    onPanResponderMove: (_, gestureState) => {
      const { y: colY, height: colH } = sideColumnLayout.current;
      if (colH === 0) return;
      const relativeY = gestureState.moveY - colY;
      const newPct = (relativeY / colH) * 100;
      if (newPct > 15 && newPct < 85) setSideHeightPct(newPct);
    },
    onPanResponderRelease: () => setIsResizing(false),
    onPanResponderTerminate: () => setIsResizing(false),
  }), []);

  const toggleTheme = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDarkMode(prev => {
      const next = !prev;
      Cookies.set('theme', next ? 'dark' : 'light', { expires: 365 });
      return next;
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      const savedCode = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedCode) setCode(savedCode);
      const savedTheme = Cookies.get('theme');
      if (savedTheme) setIsDarkMode(savedTheme === 'dark');
    };
    loadSettings();
  }, []);

  useEffect(() => { if (code) AsyncStorage.setItem(STORAGE_KEY, code); }, [code]);

  const updateMemory = () => setMemoryData(getMemoryRange(0x10010000, 20));

  return (
    <PageWrapper>
      <SafeAreaView style={[tStyles.safeArea, isResizing && styles.noSelect]}>
        <StatusBar barStyle={activeTheme.statusBarStyle as any} />
        <View style={tStyles.container}>

          <View style={styles.topBar}>
            <Image
              source={isDarkMode ? require('../../assets/images/WIMPS_dark.png') : require('../../assets/images/WIMPS_light.png')}
              style={styles.logo}
            />
            <View style={styles.minimizedTray}>
              {minimized.editor && minimized.console && (
                <TabItem label="Editor & Console" onPress={() => setMinimized(p => ({ ...p, editor: false, console: false }))} />
              )}
              {minimized.registers && minimized.memory && (
                <TabItem label="Registers & Memory" onPress={() => setMinimized(p => ({ ...p, registers: false, memory: false }))} />
              )}
            </View>
            <View style={styles.topBarActions}>
              <ThemeSwitch isDark={isDarkMode} toggle={toggleTheme} />
              <TouchableOpacity style={tStyles.secondaryButton} onPress={() => window.open('/docs', '_self')}>
                <Text style={tStyles.secondaryButtonText}>Docs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => window.open('/login', '_self')}>
                <Text style={styles.primaryButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isWide ? (
            <View style={styles.desktopContent}>
              {(!minimized.editor || !minimized.console) && (
                <View
                  ref={editorColumnRef}
                  style={[
                    styles.editorColumn,
                    { width: (minimized.registers && minimized.memory) ? '100%' : `${leftPanelPct}%` },
                  ]}
                >
                  <WindowWrapper
                    title="MIPS Editor"
                    theme={activeTheme}
                    isMinimized={minimized.editor}
                    onToggleMinimize={() => toggleWindow('editor')}
                    onMaximize={() => maximizeWindow('editor')}
                    style={!minimized.editor
                      ? { height: minimized.console ? 'calc(100% - 24px)' : `${editorHeightPct}%` }
                      : { height: 40 }
                    }
                  >
                    <CodeEditor code={code} setCode={setCode} actions={editorActions} theme={activeTheme} />
                  </WindowWrapper>

                  {!minimized.editor && !minimized.console && (
                    <View {...panResponderVertical.panHandlers} style={styles.resizerHorizontal}>
                      <View style={tStyles.resizerHorizontalLine} />
                    </View>
                  )}

                  <WindowWrapper
                    title="Console Output"
                    theme={activeTheme}
                    isMinimized={minimized.console}
                    onToggleMinimize={() => toggleWindow('console')}
                    onMaximize={() => maximizeWindow('console')}
                    style={!minimized.console
                      ? { height: minimized.editor ? '100%' : `${100 - editorHeightPct}%`}
                      : { height: 40}
                    }
                  >
                    <View style={[tStyles.consoleCard, { flex: 1 }]}>
                      <ScrollView>
                        <Text style={tStyles.consoleText}>{output}</Text>
                      </ScrollView>
                    </View>
                  </WindowWrapper>
                </View>
              )}

              {(!minimized.editor || !minimized.console) && (!minimized.registers || !minimized.memory) && (
                <View {...panResponderHorizontal.panHandlers} style={styles.resizerVertical}>
                  <View style={tStyles.resizerVerticalLine} />
                </View>
              )}

              {(!minimized.registers || !minimized.memory) && (
                // ✅ Attach ref to side column for measurement
                <View
                  ref={sideColumnRef}
                  style={[styles.sideColumn, { width: (minimized.editor && minimized.console) ? '100%' : `${100 - leftPanelPct}%` }]}
                >
                  {/* ✅ Explicit height so registers doesn't grow unbounded */}
                  <WindowWrapper
                    title="Registers"
                    theme={activeTheme}
                    isMinimized={minimized.registers}
                    onToggleMinimize={() => toggleWindow('registers')}
                    onMaximize={() => maximizeWindow('registers')}
                    style={!minimized.registers
                      ? { height: minimized.memory ? 'calc(100% - 24px)' : `${sideHeightPct}%` }
                      : { height: 40 }
                    }
                  >
                    <RegisterPanel registers={registers} theme={activeTheme} showHex={showHex} toggleFormat={() => setShowHex(p => !p)} />
                  </WindowWrapper>

                  {/* ✅ Resizer between registers and memory */}
                  {!minimized.registers && !minimized.memory && (
                    <View {...panResponderSideVertical.panHandlers} style={styles.resizerHorizontal}>
                      <View style={tStyles.resizerHorizontalLine} />
                    </View>
                  )}

                  {/* ✅ Explicit height so memory is strictly bounded */}
                  <WindowWrapper
                    title="Memory View"
                    theme={activeTheme}
                    isMinimized={minimized.memory}
                    onToggleMinimize={() => toggleWindow('memory')}
                    onMaximize={() => maximizeWindow('memory')}
                    style={!minimized.memory
                      ? { height: minimized.registers ? '100%' : `${100 - sideHeightPct}%` }
                      : { height: 40 }
                    }
                  >
                    <MemoryView data={memoryData} theme={activeTheme} />
                  </WindowWrapper>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.mobileContent}>
              <CodeEditor code={code} setCode={setCode} actions={editorActions} theme={activeTheme} />
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
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  logo: { width: 200, height: 44, resizeMode: 'contain' },
  minimizedTray: { flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, elevation: 2 },
  tabText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  topBarActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  primaryButtonText: { color: '#ffffff', fontWeight: '600' },
  desktopContent: { flex: 1, flexDirection: 'row' },
  editorColumn: { height: '100%', paddingRight: 4, paddingBottom: 12 },
  sideColumn: { height: '100%', paddingLeft: 4 },
  resizerVertical: { width: 16, justifyContent: 'center', alignItems: 'center', cursor: 'col-resize' as any },
  resizerHorizontal: { height: 16, justifyContent: 'center', alignItems: 'center', cursor: 'row-resize' as any, zIndex: 10 },
  mobileContent: { flex: 1 },
  noSelect: { userSelect: 'none' } as any,
  switchTrack: { width: 58, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  switchIcon: { fontSize: 12, fontWeight: 'bold' },
});