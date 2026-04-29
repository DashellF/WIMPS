import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Image,
    LayoutAnimation,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';

// Theme Configuration
import type { Theme } from '../theme/themes';
import { THEMES } from '../theme/themes';

// Enable LayoutAnimation for Android
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

export default function RegisterScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const THEME_STORAGE_KEY = '@app_theme_preference';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (e) {
        console.error('Failed to load theme preference.', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(150, 'easeInEaseOut', 'opacity')
    );
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme preference.', e);
    }
  };

  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);

  const handleRegister = async () => {
    try {
      const res = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setSuccess('Account created! You can now log in.');
      setError('');
      setTimeout(() => window.open('/login', '_self'), 1500); // Send to login
    } catch (err: any) {
      setError(err.message);
      setSuccess('');
    }
  };

  return (
    <SafeAreaView style={tStyles.safeArea}>
      <StatusBar barStyle={activeTheme.statusBarStyle as any} />
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
            <ThemeSwitch isDark={isDarkMode} toggle={toggleTheme} />
            <TouchableOpacity style={tStyles.secondaryButton} onPress={() => window.open('/login', '_self')}>
              <Text style={tStyles.secondaryButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Register Form */}
        <View style={styles.formWrapper}>
          <View style={tStyles.card}>
            <Text style={tStyles.title}>Create Account</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <TextInput
              style={tStyles.input}
              placeholder="Username"
              placeholderTextColor={activeTheme.subText}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={tStyles.input}
              placeholder="Password"
              placeholderTextColor={activeTheme.subText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
              <Text style={styles.primaryButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const getThemeStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.bg,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
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
});

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  formWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#22c55e',
    marginBottom: 16,
    textAlign: 'center',
  },
});