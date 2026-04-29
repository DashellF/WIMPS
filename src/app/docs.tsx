import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { Theme } from '../theme/themes';
import { THEMES } from '../theme/themes';

// ── ThemeSwitch (ported from index.tsx) ──────────────────────────────────────
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


// ── DocsScreen ───────────────────────────────────────────────────────────────
export default function DocsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);

  const sections = [
    {
      title: 'Getting Started',
      content:
        'Write MIPS assembly in the Editor tab. Use Assemble to compile, Run to execute, Step to walk through instructions one at a time, and Reset to start over.',
    },
    {
      title: 'Registers',
      content:
        'WIMPS exposes all 32 MIPS general-purpose registers. Values update live as your program executes. Use the search bar to filter by name, number, or hex value.',
    },
    {
      title: 'Syscalls',
      content:
        'Supported syscalls include print integer ($v0=1), print string ($v0=4), read integer ($v0=5), and exit ($v0=10). Load the syscall code into $v0 and arguments into $a0–$a3 before calling syscall.',
    },
    {
      title: 'Directives',
      content:
        'Use .data to declare variables, .text for instructions, .asciiz for null-terminated strings, .word for 32-bit integers, and .space to allocate bytes.',
    },
    {
      title: 'Keyboard Shortcuts',
      content: 'WIP',
    },
  ];

  return (
    <SafeAreaView style={tStyles.safeArea}>
      <StatusBar barStyle={activeTheme.statusBarStyle} />
      <View style={tStyles.container}>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <Image
            source={
              isDarkMode
                ? require('../../assets/images/WIMPS_dark.png')
                : require('../../assets/images/WIMPS_light.png')
            }
            style={styles.logo}
          />
          <View style={styles.topBarActions}>
            <ThemeSwitch isDark={isDarkMode} toggle={() => setIsDarkMode(p => !p)} />
            <TouchableOpacity style={tStyles.secondaryButton} onPress = {() => window.open('/', '_self')}>
              <Text style={tStyles.secondaryButtonText}>IDE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText} onPress = {() => window.open('/login', '_self')}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Page Header */}
        <View style={tStyles.pageHeader}>
          <Text style={tStyles.pageTitle}>Documentation</Text>
          <Text style={tStyles.pageSubtitle}>
            Everything you need to write MIPS assembly in WIMPS
          </Text>
        </View>

        {/* Docs Sections */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {sections.map((section) => (
            <View key={section.title} style={tStyles.card}>
              <Text style={tStyles.cardTitle}>{section.title}</Text>
              <Text style={tStyles.cardBody}>{section.content}</Text>
            </View>
          ))}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
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
    pageHeader: {
      marginBottom: 20,
    },
    pageTitle: {
      color: theme.text,
      fontSize: 24,
      fontWeight: '700',
    },
    pageSubtitle: {
      color: theme.subText,
      fontSize: 14,
      marginTop: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
    },
    cardBody: {
      color: theme.subText,
      fontSize: 14,
      lineHeight: 22,
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
  scrollContent: {
    paddingBottom: 16,
  },
});