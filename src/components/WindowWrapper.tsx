import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function WindowWrapper({ title, children, theme, isMinimized, onToggleMinimize, onMaximize, style }: any) {
  return (
    <View style={[
      styles.windowContainer,
      {
        backgroundColor: theme.bg,
        borderColor: theme.border,
        marginBottom: isMinimized ? 8 : 0,
      },
      // ✅ Merge the parent-supplied style LAST so height/flex values win
      style,
      // ✅ But always enforce minimized overrides on top
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
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#ff605c' }]}
            onPress={onToggleMinimize}
          />
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#ffbd2e' }]}
            onPress={onToggleMinimize}
          />
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#27c93f' }]}
            onPress={onMaximize}
          />
        </View>
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

const styles = StyleSheet.create({
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
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  titleText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});