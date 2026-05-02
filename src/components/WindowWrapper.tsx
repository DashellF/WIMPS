import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../theme/themes';
export function WindowWrapper({ title, children, theme, isMinimized, onToggleMinimize, onMaximize, style }: any) {
  const styles = getThemeStyles(theme);
  return (
    <View style={[
      styles.windowContainer,
      {
        backgroundColor: theme.bg,
        borderColor: theme.border,
        marginBottom: isMinimized ? 8 : 0,
      },
      style,
      isMinimized && { flex: 0, height: 34, minHeight: 34 },
    ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onToggleMinimize}
        style={[
          styles.titleBar,
          {
            backgroundColor: theme.card,
            borderBottomColor: isMinimized ? 'transparent' : theme.border,
          },
        ]}
      >
          <Text
            style={[styles.controlButton]}
            onPress={onToggleMinimize}
          >⌄</Text>
        <Text style={[styles.titleText, { color: theme.text }]}>
          {title} {isMinimized && ' (Minimized)'}
        </Text>
        <View style={{ width: 60 }} />
      </TouchableOpacity>

      {!isMinimized && (
        <View style={styles.contentArea}>
          {children}
        </View>
      )}
    </View>
  );
}

const getThemeStyles = (theme: Theme) =>
  StyleSheet.create({
  windowContainer: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  titleBar: {
    height: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  contentArea: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    width: 60,
  },
  controlButton: {
    marginBottom: 10,
    color: theme.text,
    fontSize: 20
  },
  titleText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});