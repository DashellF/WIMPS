import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { isThemeDark } from '../helpers/themeHelper';
import { THEMES } from '../theme/themes';

export const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isReady, setIsReady] = useState(false);
  const isDark = isThemeDark();
  const theme = isDark ? THEMES.dark : THEMES.light;

  useEffect(() => {
    // Perform all "General" checks here (Cookies, Tokens, etc.)
    const prepare = async () => {
      try {
        // Small delay to allow the StyleSheet to register in the browser
        await new Promise(resolve => setTimeout(resolve, 0));
      } finally {
        setIsReady(true);
      }
    };
    prepare();
  }, []);

  if (!isReady) {
    // Render a blank screen with the correct background color to prevent flashing
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  return <>{children}</>;
};