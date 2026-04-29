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
import { CodeEditor } from '../components/CodeEditor';
import { MemoryView } from '../components/MemoryView'; // Adjust path as needed
import { RegisterPanel, RegisterValue } from '../components/RegisterPanel';
import { assemble, getMemoryRange, getState, resetSim, runSim, stepSim } from '../simulator/useMips';

// 1. Theme Configuration
import type { Theme } from '../theme/themes';
import { THEMES } from '../theme/themes';
console.log('THEMES:', THEMES);

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


// 2. Custom Animated Switch Component
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
      <Animated.View
        style={{
          width: 58,
          height: 32,
          borderRadius: 16,
          backgroundColor: trackBg,
          borderColor: trackBorder,
          borderWidth: 2,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: thumbBg,
            transform: [{ translateX: thumbPosition }],
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.Text
            style={{
              color: iconColor,
              fontSize: 12,
              fontWeight: 'bold',
              lineHeight: 14,
              paddingLeft: isDark ? 1 : 0,
            }}
          >
            {isDark ? '☾' : '☼'}
          </Animated.Text>
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

  return names.map((name, index) => ({
    name,
    number: index,
    hexValue: '0x00000000',
  }));
};

export default function IdeScreen() {

  const { height, width } = useWindowDimensions();
  const isWide = width >= 1000;

  const [code, setCode] = useState('');
  const [registers, setRegisters] = useState<RegisterValue[]>(buildInitialRegisters());
  const [output, setOutput] = useState('Program output will appear here.');
  const [activeTab, setActiveTab] = useState<'editor' | 'registers' | 'console'>('editor');
  const STORAGE_KEY = '@mips_editor_code';
  const [memoryData, setMemoryData] = useState<any[]>([]);

  const [isDarkMode, setIsDarkMode] = useState(true);

  const [leftPanelPct, setLeftPanelPct] = useState(80);
  const [editorHeightPct, setEditorHeightPct] = useState(80);

  const toggleTheme = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(150, 'easeInEaseOut', 'opacity')
    );
    setIsDarkMode((prev) => !prev);
  };

  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);



  const editorActions = useMemo(() => [
    {
      label: 'Assemble',
      onPress: () => {
        const result = assemble(code);
        if (!result.ok) {
          setOutput(`Assembly error:\n${result.error}`);
        } else {
          const state = getState();
          if (state) setRegisters(state.registers);
          updateMemory();
          setOutput('Assembled successfully. Press Run or Step.');
        }
      },
    },
    {
      label: 'Run',
      onPress: () => {
        const result = runSim();
        if ('error' in result) {
          setOutput(`Runtime error:\n${result.error}`);
        } else {
          setRegisters(result.registers);
          updateMemory();
          setOutput(result.output || 'Program finished.');
        }
      },
    },
    {
      label: 'Step',
      onPress: () => {
        const result = stepSim();
        if ('error' in result) {
          setOutput(`Step error:\n${result.error}`);
        } else {
          setRegisters(result.registers);
          updateMemory();
          setOutput(result.output || `PC: 0x${result.pc.toString(16).padStart(8, '0')}`);
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
    {
      label: 'Save',
      onPress: async () => {
        await AsyncStorage.setItem(STORAGE_KEY, code);
        setOutput('Program saved to local storage.');
      },
    },
  ], [code]);


  const panResponderHorizontal = useMemo(
  () =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        evt.preventDefault?.();
        if (typeof document !== 'undefined') {
          document.body.style.userSelect = 'none';
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const newPct = ((gestureState.moveX - 16) / (width - 32)) * 100;
        if (newPct > 20 && newPct < 80) {
          setLeftPanelPct(newPct);
        }
      },

      onPanResponderRelease: () => {
        if (typeof document !== 'undefined') {
          document.body.style.userSelect = '';
        }
      },
    }),
  [width]
);

  const panResponderVertical = useMemo(
  () =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        evt.preventDefault?.();
        if (typeof document !== 'undefined') {
          document.body.style.userSelect = 'none';
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const topOffset = 100;
        const availableHeight = height - topOffset - 32;
        const newPct = ((gestureState.moveY - topOffset) / availableHeight) * 100;

        if (newPct >= 35 && newPct <= 80) {
          setEditorHeightPct(newPct);
        }
      },

      onPanResponderRelease: () => {
        if (typeof document !== 'undefined') {
          document.body.style.userSelect = '';
        }
      },
    }),
  [height]
);

  const docsPress = () => window.open('/docs', '_self')
  const loginPress = () => window.open('/login', '_self')
  
  useEffect(() => {
    const loadCode = async () => {
      try {
        const savedCode = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedCode !== null) {
          setCode(savedCode);
        }
      } catch (e) {
        console.error('Failed to load code.', e);
      }
    };

    loadCode();
  }, []);

  useEffect(() => {
    const saveCode = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, code);
      } catch (e) {
        console.error('Failed to save code.', e);
      }
    };

    // We use a small delay (debounce) or just save directly
    saveCode();
  }, [code]);

  const updateMemory = () => {
    const data = getMemoryRange(0x10010000, 20); // Read 20 words from data segment
    setMemoryData(data);
  };
  return (
    <SafeAreaView style={tStyles.safeArea}>
      <StatusBar barStyle={activeTheme.statusBarStyle as any} />
      <View style={tStyles.container}>
        <View style={styles.topBar}>
          <View style={isWide ? styles.titleGroupWeb : undefined}>
            {/* Added dynamic logo based on theme */}
            <Image 
              source={
                isDarkMode 
                  ? require('../../assets/images/WIMPS_dark.png') 
                  : require('../../assets/images/WIMPS_light.png')
              } 
              style={styles.logo}  
            />
          </View>

          <View style={styles.topBarActions}>
            <ThemeSwitch isDark={isDarkMode} toggle={toggleTheme} />
            <TouchableOpacity style={tStyles.secondaryButton} onPress={(docsPress)}>
              <Text style={tStyles.secondaryButtonText}>Docs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={(loginPress)}>
              <Text style={styles.primaryButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        

        {!isWide && (
          <View style={tStyles.mobileTabs}>
            {(['editor', 'registers', 'console'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.mobileTab, activeTab === tab && tStyles.mobileTabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    tStyles.mobileTabText,
                    activeTab === tab && tStyles.mobileTabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isWide ? (
          <View style={styles.desktopContent}>
            <View style={[styles.editorColumn, { width: `${leftPanelPct}%` }]}>
              
              {/* Top half: Editor */}
              <View style={{ flex: editorHeightPct, paddingBottom: 4 }}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                  
                  <CodeEditor 
                    code={code} 
                    setCode={setCode} 
                    actions={editorActions} 
                    theme={activeTheme} 
                  />
                </View>
              </View>

              {/* Draggable Vertical Divider */}
              {Platform.OS === 'web' ? (
                <View {...panResponderVertical.panHandlers} style={styles.resizerHorizontal}>
                  <View style={tStyles.resizerHorizontalLine} />
                </View>
              ) : (
                <View style={{ height: 16 }} />
              )}

              {/* Bottom half: Console */}
              <View style={{ flex: 100 - editorHeightPct, paddingTop: 4 }}>
                <View style={[tStyles.consoleCard, { flex: 1, minHeight: 0 }]}>
                  <Text style={tStyles.panelTitle}>Console Output</Text>
                  <ScrollView style={styles.consoleOutput}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                  >
                    <Text style={tStyles.consoleText}>{output}</Text>
                    
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Draggable Horizontal Divider */}
            {Platform.OS === 'web' ? (
              <View {...panResponderHorizontal.panHandlers} style={styles.resizerVertical}>
                <View style={tStyles.resizerVerticalLine} />
              </View>
            ) : (
              <View style={{ width: 16 }} />
            )}

            <View style={[styles.sideColumn, { width: `${100 - leftPanelPct}%` }]}>
              <RegisterPanel registers={registers} theme={activeTheme} />
              <View style={{ height: 16 }} />
              <MemoryView data={memoryData} theme={activeTheme} />
            </View>
          </View>
        ) : (
          <View style={styles.mobileContent}>
            {activeTab === 'editor' && (
              <CodeEditor 
                code={code} 
                setCode={setCode} 
                actions={editorActions} 
                theme={activeTheme} 
              />
            )}

            {activeTab === 'registers' && <RegisterPanel registers={registers} theme={activeTheme} />}

            {activeTab === 'console' && (
              <View style={tStyles.consoleCard}>
                <Text style={tStyles.panelTitle}>Console Output</Text>
                <ScrollView style={styles.consoleOutput}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                >
                  <Text style={tStyles.consoleText}>{output}</Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const getThemeStyles = (theme: Theme) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.btnBg,
  },
  secondaryButtonText: {
    color: theme.text,
    fontWeight: '600',
  },
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: theme.tabInactive,
    borderRadius: 12,
    padding: 6,
    marginBottom: 12,
    gap: 6,
  },
  mobileTabActive: {
    backgroundColor: theme.tabActive,
  },
  mobileTabText: {
    color: theme.subText,
    fontWeight: '600',
  },
  mobileTabTextActive: {
    color: theme.text,
  },
  consoleCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  panelTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  consoleText: {
    color: theme.consoleText,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  resizerVerticalLine: {
    width: 4,
    height: '20%',
    backgroundColor: theme.resizer,
    borderRadius: 2,
  },
  resizerHorizontalLine: {
    height: 4,
    width: '10%',
    backgroundColor: theme.resizer,
    borderRadius: 2,
  },
});

const styles = StyleSheet.create({

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  titleGroupWeb: {
    marginLeft: 40,
  },
  // Added styling for the logo to ensure it scales correctly
  logo: {
    width: 240,
    height: 44,
    resizeMode: 'contain',
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  desktopContent: {
    flex: 1,
    flexDirection: 'row',
  },
  editorColumn: {
    paddingRight: 8,
  },
  resizerVertical: {
    width: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // @ts-ignore
    cursor: 'col-resize' as ViewStyle, 
  },
  resizerHorizontal: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // @ts-ignore
    cursor: 'row-resize' as ViewStyle,
  },
  sideColumn: {
    paddingLeft: 8,
  },
  mobileContent: {
    flex: 1,
  },
  mobileTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  consoleOutput: {
    flex: 1,
  },
});