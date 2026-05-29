import React, { useEffect, useRef } from 'react';
import { Animated, SafeAreaView, View, useWindowDimensions } from 'react-native';
import type { Theme } from '../theme/themes';

// The skeleton fill color — slightly lighter than bg so boxes are visible but subtle
const skColor = (theme: Theme) => (theme.bg === '#0b1020' ? '#2d3748' : '#e2e8f0');

// ---------------------------------------------------------------------------
// Primitive
// ---------------------------------------------------------------------------

export function SkeletonBox({ theme, style }: { theme: Theme; style?: any }) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,    duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ backgroundColor: skColor(theme), borderRadius: 6 }, style, { opacity }]}
    />
  );
}

// ---------------------------------------------------------------------------
// Panel (mirrors WindowWrapper chrome)
// ---------------------------------------------------------------------------

const ROW_WIDTHS = ['86%', '71%', '92%', '65%', '78%', '88%', '58%', '82%', '70%', '75%'];

function SkeletonPanel({
  theme,
  style,
  rows = 4,
}: {
  theme: Theme;
  style?: any;
  rows?: number;
}) {
  return (
    <View
      style={[
        {
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          overflow: 'hidden',
          backgroundColor: theme.bg,
        },
        style,
      ]}
    >
      {/* Title bar */}
      <View
        style={{
          height: 34,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        <SkeletonBox theme={theme} style={{ width: 12, height: 12 }} />
        <SkeletonBox theme={theme} style={{ width: 80, height: 10 }} />
      </View>
      {/* Content rows */}
      <View style={{ flex: 1, padding: 14, gap: 10 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBox
            key={i}
            theme={theme}
            style={{ height: 12, width: ROW_WIDTHS[i % ROW_WIDTHS.length] }}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// IDE skeleton
// ---------------------------------------------------------------------------

export function IdeSkeleton({ theme }: { theme: Theme }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 4,
        }}
      >
        <SkeletonBox theme={theme} style={{ width: 160, height: 36 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonBox theme={theme} style={{ width: 48, height: 32, borderRadius: 8 }} />
          <SkeletonBox theme={theme} style={{ width: 64, height: 32, borderRadius: 8 }} />
          <SkeletonBox theme={theme} style={{ width: 64, height: 32, borderRadius: 8 }} />
        </View>
      </View>

      {isWide ? (
        /* Desktop: two columns */
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingBottom: 16,
            gap: 16,
          }}
        >
          {/* Editor + Console column */}
          <View style={{ flex: 7, gap: 12 }}>
            <SkeletonPanel theme={theme} style={{ flex: 65 }} rows={8} />
            <SkeletonPanel theme={theme} style={{ flex: 35 }} rows={3} />
          </View>
          {/* Registers + Memory column */}
          <View style={{ flex: 3, gap: 12 }}>
            <SkeletonPanel theme={theme} style={{ flex: 1 }} rows={10} />
            <SkeletonPanel theme={theme} style={{ flex: 1 }} rows={5} />
          </View>
        </View>
      ) : (
        /* Mobile: single panel + tab bar */
        <>
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <SkeletonPanel theme={theme} style={{ flex: 1 }} rows={10} />
          </View>
          <View
            style={{
              height: 60,
              flexDirection: 'row',
              backgroundColor: theme.card,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            {['E', 'C', 'R', 'M'].map((label) => (
              <View
                key={label}
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
              >
                <SkeletonBox theme={theme} style={{ width: 36, height: 10 }} />
              </View>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Auth skeleton  (login / register)
// ---------------------------------------------------------------------------

export function AuthSkeleton({ theme }: { theme: Theme }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 4,
        }}
      >
        <SkeletonBox theme={theme} style={{ width: 200, height: 40 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonBox theme={theme} style={{ width: 48, height: 32, borderRadius: 8 }} />
          <SkeletonBox theme={theme} style={{ width: 64, height: 32, borderRadius: 8 }} />
        </View>
      </View>

      {/* Centred card */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 24,
          }}
        >
          {/* Title */}
          <SkeletonBox theme={theme} style={{ width: 120, height: 26, alignSelf: 'center', marginBottom: 24 }} />
          {/* Input fields */}
          <SkeletonBox theme={theme} style={{ height: 46, borderRadius: 8, marginBottom: 14 }} />
          <SkeletonBox theme={theme} style={{ height: 46, borderRadius: 8, marginBottom: 20 }} />
          {/* Submit button */}
          <SkeletonBox theme={theme} style={{ height: 40, borderRadius: 10, marginBottom: 16 }} />
          {/* Link text */}
          <SkeletonBox theme={theme} style={{ width: 180, height: 12, alignSelf: 'center' }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Register skeleton  (extra confirm-password field)
// ---------------------------------------------------------------------------

export function RegisterSkeleton({ theme }: { theme: Theme }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 4,
        }}
      >
        <SkeletonBox theme={theme} style={{ width: 200, height: 40 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonBox theme={theme} style={{ width: 48, height: 32, borderRadius: 8 }} />
          <SkeletonBox theme={theme} style={{ width: 64, height: 32, borderRadius: 8 }} />
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 24,
          }}
        >
          <SkeletonBox theme={theme} style={{ width: 140, height: 26, alignSelf: 'center', marginBottom: 24 }} />
          <SkeletonBox theme={theme} style={{ height: 46, borderRadius: 8, marginBottom: 14 }} />
          <SkeletonBox theme={theme} style={{ height: 46, borderRadius: 8, marginBottom: 14 }} />
          <SkeletonBox theme={theme} style={{ height: 46, borderRadius: 8, marginBottom: 20 }} />
          <SkeletonBox theme={theme} style={{ height: 40, borderRadius: 10, marginBottom: 16 }} />
          <SkeletonBox theme={theme} style={{ width: 180, height: 12, alignSelf: 'center' }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Docs skeleton
// ---------------------------------------------------------------------------

const DOCS_ROW_WIDTHS = [72, 55, 80, 48, 68, 76, 60];

export function DocsSkeleton({ theme }: { theme: Theme }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 4,
        }}
      >
        <SkeletonBox theme={theme} style={{ width: 160, height: 36 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonBox theme={theme} style={{ width: 48, height: 32, borderRadius: 8 }} />
          <SkeletonBox theme={theme} style={{ width: 80, height: 32, borderRadius: 8 }} />
        </View>
      </View>

      {/* Search bar */}
      <SkeletonBox
        theme={theme}
        style={{ height: 42, marginHorizontal: 16, marginBottom: 16, borderRadius: 10 }}
      />

      {/* Entry rows */}
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {DOCS_ROW_WIDTHS.map((pct, i) => (
          <View
            key={i}
            style={{
              height: 52,
              backgroundColor: theme.card,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 14,
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <SkeletonBox theme={theme} style={{ width: `${pct}%`, height: 11 }} />
            <SkeletonBox theme={theme} style={{ width: `${pct - 20}%`, height: 9 }} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Home / landing page skeleton
// ---------------------------------------------------------------------------

export function HomeSkeleton({ theme }: { theme: Theme }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top bar (matches home.tsx's card-bg topBar) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.card,
        }}
      >
        <SkeletonBox theme={theme} style={{ width: 240, height: 44 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SkeletonBox theme={theme} style={{ width: 48, height: 32, borderRadius: 8 }} />
          <SkeletonBox theme={theme} style={{ width: 64, height: 36, borderRadius: 10 }} />
          <SkeletonBox theme={theme} style={{ width: 64, height: 36, borderRadius: 10 }} />
        </View>
      </View>

      {/* Hero */}
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }}
      >
        <SkeletonBox theme={theme} style={{ width: 200, height: 90, borderRadius: 8 }} />
        <SkeletonBox theme={theme} style={{ width: '55%', height: 20, marginTop: 8 }} />
        <SkeletonBox theme={theme} style={{ width: '75%', height: 14 }} />
        <SkeletonBox theme={theme} style={{ width: '60%', height: 14 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <SkeletonBox theme={theme} style={{ width: 120, height: 44, borderRadius: 10 }} />
          <SkeletonBox theme={theme} style={{ width: 80,  height: 44, borderRadius: 10 }} />
          <SkeletonBox theme={theme} style={{ width: 80,  height: 44, borderRadius: 10 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}
