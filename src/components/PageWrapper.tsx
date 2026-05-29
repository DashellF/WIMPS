import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { isThemeDark } from '../helpers/themeHelper';
import { THEMES } from '../theme/themes';
import {
  AuthSkeleton,
  DocsSkeleton,
  HomeSkeleton,
  IdeSkeleton,
  RegisterSkeleton,
} from './Skeletons';

type PageType = 'ide' | 'auth' | 'register' | 'docs' | 'home';

interface PageWrapperProps {
  children: React.ReactNode;
  page?: PageType;
}

export const PageWrapper = ({ children, page }: PageWrapperProps) => {
  const [isReady, setIsReady] = useState(false);
  const isDark = isThemeDark();
  const theme = isDark ? THEMES.dark : THEMES.light;

  useEffect(() => {
    const prepare = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 0));
      } finally {
        setIsReady(true);
      }
    };
    prepare();
  }, []);

  if (!isReady) {
    if (page === 'ide')      return <IdeSkeleton      theme={theme} />;
    if (page === 'auth')     return <AuthSkeleton     theme={theme} />;
    if (page === 'register') return <RegisterSkeleton theme={theme} />;
    if (page === 'docs')     return <DocsSkeleton     theme={theme} />;
    if (page === 'home')     return <HomeSkeleton     theme={theme} />;
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  return <>{children}</>;
};
