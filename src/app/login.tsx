import { PageWrapper } from '@/components/PageWrapper';
import { router } from 'expo-router';
import Cookies from 'js-cookie';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutAnimation,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getApiHeaders, saveAuthToken } from '../helpers/authStorage';
import { THEMES } from '../theme/themes';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;


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

  const thumbPosition = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 30] });
  const trackBg = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', '#2563eb'] });
  const trackBorder = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#cbd5e1', '#2563eb'] });
  const thumbBg = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#94a3b8', '#ffffff'] });
  const iconColor = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', '#2563eb'] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
      <Animated.View style={[styles.switchTrack, { backgroundColor: trackBg, borderColor: trackBorder }]}>
        <Animated.View style={[styles.switchThumb, { backgroundColor: thumbBg, transform: [{ translateX: thumbPosition }] }]}>
          <Animated.Text style={[styles.switchIcon, { color: iconColor }]}>
            {isDark ? '☾' : '☼'}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function LoginScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const toggleTheme = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(150, 'easeInEaseOut', 'opacity'));
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    Cookies.set('theme', newMode ? 'dark' : 'light', { expires: 365 }); 
  };

  useEffect(() => {
    const savedTheme = Cookies.get('theme'); 
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  const activeTheme = isDarkMode ? THEMES.dark : THEMES.light;
  const tStyles = useMemo(() => getThemeStyles(activeTheme), [activeTheme]);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getApiHeaders(null, true),
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      await saveAuthToken(data.token);

      router.replace('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <PageWrapper>
      <SafeAreaView style={tStyles.safeArea}>
        <StatusBar barStyle={activeTheme.statusBarStyle as any} />
        <View style={tStyles.container}>
          <View style={styles.topBar}>
            <Image source={isDarkMode ? require('../../assets/images/WIMPS_dark.png') : require('../../assets/images/WIMPS_light.png')} style={styles.logo} />
            <View style={styles.topBarActions}>
              <ThemeSwitch isDark={isDarkMode} toggle={toggleTheme} />
              <TouchableOpacity style={tStyles.secondaryButton} onPress={() => router.push('/')}><Text style={tStyles.secondaryButtonText}>IDE</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.formWrapper}>
            <View style={tStyles.card}>
              <Text style={tStyles.title}>Login</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TextInput style={tStyles.input} placeholder="Username" placeholderTextColor={activeTheme.subText} value={username} onChangeText={setUsername} autoCapitalize="none" />
              <TextInput style={tStyles.input} placeholder="Password" placeholderTextColor={activeTheme.subText} value={password} onChangeText={setPassword} secureTextEntry />
              <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}><Text style={styles.primaryButtonText}>Sign In</Text></TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.push('/register')}><Text style={{ color: activeTheme.text, textAlign: 'center' }}>Don't have an account? Register</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </PageWrapper>
  );
}

const getThemeStyles = (theme: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.border, width: '100%', maxWidth: 400 },
  title: { color: theme.text, fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: theme.bg, color: theme.text, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 16 },
  secondaryButton: { borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.btnBg },
  secondaryButtonText: { color: theme.text, fontWeight: '600' },
});

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, gap: 12 },
  logo: { width: 240, height: 44, resizeMode: 'contain' },
  topBarActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  formWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  primaryButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  primaryButtonText: { color: '#ffffff', fontWeight: '600' },
  errorText: { color: '#ef4444', marginBottom: 16, textAlign: 'center' },
  switchTrack: { width: 58, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  switchIcon: { fontSize: 12, fontWeight: 'bold', lineHeight: 14 },
});