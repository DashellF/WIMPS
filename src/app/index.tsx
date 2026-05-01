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
import Cookies from 'js-cookie'; //

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

// --- Theme Switch Component ---
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
    <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
      <Animated.View style={{ width: 58, height: 32, borderRadius: 16, backgroundColor: trackBg, borderColor: trackBorder, borderWidth: 2, justifyContent: 'center' }}>
        <Animated.View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: thumbBg, transform: [{ translateX: thumbPosition }], justifyContent: 'center', alignItems: 'center' }}>
          <Animated.Text style={{ color: iconColor, fontSize: 12, fontWeight: 'bold', lineHeight: 14 }}>{isDark ? '☾' : '☼'}</Animated.Text>
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

export default function IdeScreen() {
  const { height, width } = useWindowDimensions();
  const isWide = width >= 1000;

  const [code, setCode] = useState('');
  const [registers, setRegisters] = useState<RegisterValue[]>(buildInitialRegisters());
  const [output, setOutput] = useState('Program output will appear here.');
  const [memoryData, setMemoryData] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showHex, setShowHex] = useState(true);

  const [leftPanelPct, setLeftPanelPct] = useState(70);
  const [minimized, setMinimized] = useState({
    editor: false,
    console: false,
    registers: false,
    memory: false,
  });

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

  const isLeftGroupMinimized = minimized.editor && minimized.console;
  const isRightGroupMinimized = minimized.registers && minimized.memory;

  const TabItem = ({ label, onPress }: { label: string, onPress: () => void }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.tab, { backgroundColor: activeTheme.card, borderColor: activeTheme.border }]}
    >
      <Text style={[styles.tabText, { color: activeTheme.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  const editorActions = useMemo(() => [
    {
      label: 'Assemble',
      icon: require('../../assets/images/assemble_icon.png'),
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
      icon: require('../../assets/images/run_icon.png'),
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
      label: 'Step',
      icon: require('../../assets/images/step_icon.png'),
      onPress: () => {
        const result = stepSim();
        if ('error' in result) {
          setOutput(`Step error:\n${result.error}`);
        } else {
          setRegisters(result.registers);
          updateMemory();
          setOutput(`PC: 0x${result.pc.toString(16).padStart(8, '0')}\n` + result.output);
        }
      },
    },
    {
        label: 'Reset',
        icon: require('../../assets/images/reset_icon.png'),
        onPress: () => {
          resetSim();
          setRegisters(buildInitialRegisters());
          setOutput('Reset.');
        },
    },
  ], [code]);

  const panResponderHorizontal = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newPct = ((gestureState.moveX - 16) / (width - 32)) * 100;
      if (newPct > 10 && newPct < 90) setLeftPanelPct(newPct);
    },
  }), [width]);

  const toggleTheme = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDarkMode((prev) => {
      const nextMode = !prev;
      Cookies.set('theme', nextMode ? 'dark' : 'light', { expires: 365 }); //
      return nextMode;
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      const savedCode = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedCode) setCode(savedCode);
      
      const savedTheme = Cookies.get('theme'); //
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (code) AsyncStorage.setItem(STORAGE_KEY, code);
  }, [code]);

  const updateMemory = () => {
    const data = getMemoryRange(0x10010000, 20);
    setMemoryData(data);
  };

  return (
    <PageWrapper>
      <SafeAreaView style={tStyles.safeArea}>
        <StatusBar barStyle={activeTheme.statusBarStyle as any} />
        <View style={tStyles.container}>
          
          <View style={styles.topBar}>
            <Image 
              source={isDarkMode ? require('../../assets/images/WIMPS_dark.png') : require('../../assets/images/WIMPS_light.png')} 
              style={styles.logo}  
            />

            <View style={styles.minimizedTray}>
              {isLeftGroupMinimized && (
                <TabItem 
                  label="Editor & Console" 
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setMinimized(prev => ({ ...prev, editor: false, console: false }));
                  }} 
                />
              )}
              {isRightGroupMinimized && (
                <TabItem 
                  label="Registers & Memory" 
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setMinimized(prev => ({ ...prev, registers: false, memory: false }));
                  }} 
                />
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
              {!isLeftGroupMinimized && (
                <View style={[styles.editorColumn, { width: isRightGroupMinimized ? '100%' : `${leftPanelPct}%` }]}>
                  <WindowWrapper 
                    title="MIPS Editor" 
                    theme={activeTheme} 
                    isMinimized={minimized.editor}
                    onToggleMinimize={() => toggleWindow('editor')}
                    onMaximize={() => maximizeWindow('editor')}
                  >
                    <CodeEditor code={code} setCode={setCode} actions={editorActions} theme={activeTheme} />
                  </WindowWrapper>

                  <WindowWrapper 
                    title="Console Output" 
                    theme={activeTheme} 
                    isMinimized={minimized.console}
                    onToggleMinimize={() => toggleWindow('console')}
                    onMaximize={() => maximizeWindow('console')}
                  >
                    <View style={[tStyles.consoleCard, { flex: 1 }]}>
                      <ScrollView style={styles.consoleOutput} showsVerticalScrollIndicator={true}>
                        <Text style={tStyles.consoleText}>{output}</Text>
                      </ScrollView>
                    </View>
                  </WindowWrapper>
                </View>
              )}

              {!isLeftGroupMinimized && !isRightGroupMinimized && (
                <View {...panResponderHorizontal.panHandlers} style={styles.resizerVertical}>
                  <View style={tStyles.resizerVerticalLine} />
                </View>
              )}

              {!isRightGroupMinimized && (
                <View style={[styles.sideColumn, { width: isLeftGroupMinimized ? '100%' : `${100 - leftPanelPct}%` }]}>
                  <WindowWrapper 
                    title="Registers" 
                    theme={activeTheme} 
                    isMinimized={minimized.registers}
                    onToggleMinimize={() => toggleWindow('registers')}
                    onMaximize={() => maximizeWindow('registers')}
                  >
                    <RegisterPanel
                      registers={registers}
                      theme={activeTheme}
                      showHex={showHex}
                      toggleFormat={() => setShowHex(prev => !prev)}
                    />
                  </WindowWrapper>

                  <WindowWrapper 
                    title="Memory View" 
                    theme={activeTheme} 
                    isMinimized={minimized.memory}
                    onToggleMinimize={() => toggleWindow('memory')}
                    onMaximize={() => maximizeWindow('memory')}
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
  consoleCard: { flex: 1, backgroundColor: theme.card, padding: 14},
  consoleText: { color: theme.consoleText, fontFamily: 'monospace', lineHeight: 20 },
  resizerVerticalLine: { width: 4, height: 40, backgroundColor: theme.resizer, borderRadius: 2 },
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
  editorColumn: { height: '100%', paddingRight: 4 },
  sideColumn: { height: '100%', paddingLeft: 4 },
  resizerVertical: { width: 16, justifyContent: 'center', alignItems: 'center', cursor: 'col-resize' as any },
  consoleOutput: { flex: 1 },
  mobileContent: { flex: 1 },
});