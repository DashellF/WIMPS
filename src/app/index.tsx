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
import { assemble, getMemoryRange, getState, resetSim, runSim } from '../simulator/useMips';

import { PageWrapper } from '@/components/PageWrapper';
import type { Theme } from '../theme/themes';
import { THEMES } from '../theme/themes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Custom Animated Switch Component
interface ThemeSwitchProps {
  isDark: boolean;
  toggle: () => void;
}

const ThemeSwitch = ({ isDark, toggle }: ThemeSwitchProps) => {
  const slideAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isDark ? 1 : 0,
      duration: 150, 
      useNativeDriver: false, 
    }).start();
  }, [isDark]);

  const thumbPosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 30], 
  });

  const trackBg = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#2563eb'], 
  });

  const trackBorder = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#cbd5e1', '#2563eb'], 
  });

  const thumbBg = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#94a3b8', '#ffffff'], 
  });

  const iconColor = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#2563eb'], 
  });

  return (
    <PageWrapper>
      <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
        <Animated.View style={{ width: 58, height: 32, borderRadius: 16, backgroundColor: trackBg, borderColor: trackBorder, borderWidth: 2, justifyContent: 'center' }}>
          <Animated.View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: thumbBg, transform: [{ translateX: thumbPosition }], justifyContent: 'center', alignItems: 'center' }}>
            <Animated.Text style={{ color: iconColor, fontSize: 12, fontWeight: 'bold', lineHeight: 14 }}>{isDark ? '☾' : '☼'}</Animated.Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </PageWrapper>
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

export default function IdeScreen() {
  const { height, width } = useWindowDimensions();
  const isWide = width >= 1000;

  const [code, setCode] = useState('');
  const [registers, setRegisters] = useState<RegisterValue[]>(buildInitialRegisters());
  const [output, setOutput] = useState('Program output will appear here.');
  const [activeTab, setActiveTab] = useState<'editor' | 'registers' | 'console'>('editor');
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [leftPanelPct, setLeftPanelPct] = useState(70);
  const [editorHeightPct, setEditorHeightPct] = useState(70);

  const [minimized, setMinimized] = useState({
    editor: false,
    console: false,
    registers: false,
    memory: false,
  });

  // --- ANIMATION VALUES ---
  const windowAnims = useRef({
    editor: new Animated.Value(0),
    console: new Animated.Value(0),
    registers: new Animated.Value(0),
    memory: new Animated.Value(0),
  }).current;

  const STORAGE_KEY = '@mips_editor_code';

  const toggleWindow = (key: keyof typeof minimized) => {
    const isMinimizing = !minimized[key];
    
    // Smooth transition for the rest of the layout
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (isMinimizing) {
      Animated.spring(windowAnims[key], {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        setMinimized(prev => ({ ...prev, [key]: true }));
      }, 150); 
    } else {
      setMinimized(prev => ({ ...prev, [key]: false }));
      windowAnims[key].setValue(1);
      Animated.spring(windowAnims[key], {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  // --- MAXIMIZE LOGIC ---
  const maximizeWindow = (targetKey: keyof typeof minimized) => {
    // Only minimize windows that aren't already minimized and aren't the target
    const windowsToMinimize = (Object.keys(minimized) as Array<keyof typeof minimized>)
      .filter(key => key !== targetKey && !minimized[key]);

    if (windowsToMinimize.length === 0) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    windowsToMinimize.forEach(key => {
      Animated.spring(windowAnims[key], {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });

    setTimeout(() => {
      setMinimized(prev => {
        const newState = { ...prev };
        windowsToMinimize.forEach(key => { newState[key] = true; });
        return newState;
      });
    }, 150);
  };

  const getGenieStyle = (key: keyof typeof minimized) => ({
    opacity: windowAnims[key].interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        scale: windowAnims[key].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.4],
        }),
      },
      {
        translateY: windowAnims[key].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -height / 4], 
        }),
      },
    ],
  });

  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);

  const WindowIcon = ({ label, onPress, theme }: any) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.dockIcon, 
        { 
          borderRadius: 8,
          borderWidth: 2,
          overflow: 'hidden',
          backgroundColor: theme.card, 
          borderStyle: 'solid',
          borderColor: theme.card,
        }
      ]}
    >
      <Text style={{ 
        color: theme.text,
        fontSize: 12, 
        fontWeight: 'bold' 
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const editorActions = useMemo(() => [
    {
      label: 'Assemble',
      onPress: () => {
        const result = assemble(code);
        if (!result.ok) setOutput(`Assembly error:\n${result.error}`);
        else {
          const state = getState();
          if (state) setRegisters(state.registers);
          updateMemory();
          setOutput('Assembled successfully.');
        }
      },
    },
    {
      label: 'Run',
      onPress: () => {
        const result = runSim();
        if ('error' in result) setOutput(`Runtime error:\n${result.error}`);
        else {
          setRegisters(result.registers);
          updateMemory();
          setOutput(result.output || 'Program finished.');
        }
      },
    },
    {
        label: 'Reset',
        onPress: () => {
          resetSim();
          setRegisters(buildInitialRegisters());
          setOutput('Reset.');
        },
    },
  ], [code]);

  const panResponderHorizontal = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      if (typeof document !== 'undefined') document.body.style.userSelect = 'none';
    },
    onPanResponderMove: (_, gestureState) => {
      const newPct = ((gestureState.moveX - 16) / (width - 32)) * 100;
      if (newPct > 10 && newPct < 90) setLeftPanelPct(newPct);
    },
    onPanResponderRelease: () => {
      if (typeof document !== 'undefined') document.body.style.userSelect = '';
    },
  }), [width]);

  const panResponderVertical = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      if (typeof document !== 'undefined') document.body.style.userSelect = 'none';
    },
    onPanResponderMove: (_, gestureState) => {
      const availableHeight = height - 132;
      const newPct = ((gestureState.moveY - 100) / availableHeight) * 100;
      if (newPct > 10 && newPct < 90) setEditorHeightPct(newPct);
    },
    onPanResponderRelease: () => {
      if (typeof document !== 'undefined') document.body.style.userSelect = '';
    },
  }), [height]);

  const toggleTheme = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDarkMode((prev) => {
      const nextMode = !prev;
      // Save to cookie (expires in 365 days)
      Cookies.set('theme', nextMode ? 'dark' : 'light', { expires: 365 });
      return nextMode;
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      // 1. Load Code from AsyncStorage
      const savedCode = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedCode) setCode(savedCode);

      const savedTheme = Cookies.get('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadCode = async () => {
      const savedCode = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedCode) setCode(savedCode);
    };
    loadCode();
  }, []);

  const updateMemory = () => {
    const data = getMemoryRange(0x10010000, 20);
    setMemoryData(data);
  };

  return (
      <PageWrapper>
      <SafeAreaView style={tStyles.safeArea}>
        <StatusBar barStyle={activeTheme.statusBarStyle as any} />
        <View style={tStyles.container}>
          
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <Image 
              source={isDarkMode ? require('../../assets/images/WIMPS_dark.png') : require('../../assets/images/WIMPS_light.png')} 
              style={styles.logo}  
            />

            <View style={styles.topBarActions}>
              <View style={styles.dock}>
                {minimized.registers && <WindowIcon label="R" theme={activeTheme} onPress={() => toggleWindow('registers')} />}
                {minimized.console && <WindowIcon label="O" theme={activeTheme} onPress={() => toggleWindow('console')} />}              
                {minimized.memory && <WindowIcon label="M" theme={activeTheme} onPress={() => toggleWindow('memory')} />}
                {minimized.editor && <WindowIcon label="E" theme={activeTheme} onPress={() => toggleWindow('editor')} />}
              </View>

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
              {/* LEFT COLUMN */}
              {(!minimized.editor || !minimized.console) && (
                <View style={[styles.editorColumn, { width: (minimized.registers && minimized.memory) ? '100%' : `${leftPanelPct}%` }]}>
                  {!minimized.editor && (
                    <Animated.View style={[{ flex: minimized.console ? 1 : editorHeightPct / 100 }, getGenieStyle('editor')]}>
                      <WindowWrapper 
                        title="MIPS Editor" 
                        theme={activeTheme} 
                        onToggleMinimize={() => toggleWindow('editor')}
                        onMaximize={() => maximizeWindow('editor')}
                      >
                        <CodeEditor code={code} setCode={setCode} actions={editorActions} theme={activeTheme} />
                      </WindowWrapper>
                    </Animated.View>
                  )}

                  {!minimized.editor && !minimized.console && (
                    <View {...panResponderVertical.panHandlers} style={styles.resizerHorizontal}>
                      <View style={tStyles.resizerHorizontalLine} />
                    </View>
                  )}

                  {!minimized.console && (
                    <Animated.View style={[{ flex: minimized.editor ? 1 : (100 - editorHeightPct) / 100 }, getGenieStyle('console')]}>
                      <WindowWrapper 
                        title="Console Output" 
                        theme={activeTheme} 
                        onToggleMinimize={() => toggleWindow('console')}
                        onMaximize={() => maximizeWindow('console')}
                      >
                        <View style={[tStyles.consoleCard, { flex: 1 }]}>
                          <ScrollView style={styles.consoleOutput} showsVerticalScrollIndicator={false}>
                            <Text style={tStyles.consoleText}>{output}</Text>
                          </ScrollView>
                        </View>
                      </WindowWrapper>
                    </Animated.View>
                  )}
                </View>
              )}

              {/* VERTICAL RESIZER */}
              {(!minimized.editor || !minimized.console) && (!minimized.registers || !minimized.memory) && (
                <View {...panResponderHorizontal.panHandlers} style={styles.resizerVertical}>
                  <View style={tStyles.resizerVerticalLine} />
                </View>
              )}

              {/* RIGHT COLUMN */}
              {(!minimized.registers || !minimized.memory) && (
                <View style={[styles.sideColumn, { width: (minimized.editor && minimized.console) ? '100%' : `${100 - leftPanelPct}%` }]}>
                  {!minimized.registers && (
                    <Animated.View style={[{ flex: 1 }, getGenieStyle('registers')]}>
                      <WindowWrapper 
                        title="Registers" 
                        theme={activeTheme} 
                        onToggleMinimize={() => toggleWindow('registers')}
                        onMaximize={() => maximizeWindow('registers')}
                      >
                        <RegisterPanel registers={registers} theme={activeTheme} />
                      </WindowWrapper>
                    </Animated.View>
                  )}
                  {!minimized.memory && (
                    <Animated.View style={[{ flex: 1, marginTop: minimized.registers ? 0 : 12 }, getGenieStyle('memory')]}>
                      <WindowWrapper 
                        title="Memory View" 
                        theme={activeTheme} 
                        onToggleMinimize={() => toggleWindow('memory')}
                        onMaximize={() => maximizeWindow('memory')}
                      >
                        <MemoryView data={memoryData} theme={activeTheme} />
                      </WindowWrapper>
                    </Animated.View>
                  )}
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
  consoleCard: { flex: 1, backgroundColor: theme.card, padding: 14},
  consoleText: { color: theme.consoleText, fontFamily: 'monospace', lineHeight: 20 },
  panelTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  resizerVerticalLine: { width: 4, height: 40, backgroundColor: theme.resizer, borderRadius: 2 },
  resizerHorizontalLine: { height: 4, width: 40, backgroundColor: theme.resizer, borderRadius: 2 },
  mobileTabs: { flexDirection: 'row', backgroundColor: theme.tabInactive, borderRadius: 12, padding: 6, marginBottom: 12, gap: 6 },
  mobileTabActive: { backgroundColor: theme.tabActive },
  mobileTabText: { color: theme.subText, fontWeight: '600' },
  mobileTabTextActive: { color: theme.text },
});

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  logo: { width: 240, height: 44, resizeMode: 'contain' },
  topBarActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dock: { flexDirection: 'row', gap: 6, marginRight: 10 },
  dockIcon: { padding: 4, borderRadius: 8, borderWidth: 1, minWidth: 32, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  primaryButtonText: { color: '#ffffff', fontWeight: '600' },
  desktopContent: { flex: 1, flexDirection: 'row' },
  editorColumn: { height: '100%', paddingRight: 4 },
  sideColumn: { height: '100%', paddingLeft: 4 },
  resizerVertical: { width: 16, justifyContent: 'center', alignItems: 'center', cursor: 'col-resize' as any },
  resizerHorizontal: { height: 16, justifyContent: 'center', alignItems: 'center', cursor: 'row-resize' as any },
  consoleOutput: { flex: 1 },
  mobileContent: { flex: 1 },
  mobileTab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
});