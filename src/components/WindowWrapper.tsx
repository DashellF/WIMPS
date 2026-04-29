import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function WindowWrapper({ title, children, theme, isMinimized, onToggleMinimize, onMaximize }: any) {
  
  // Note: We don't return null here anymore; 
  // the parent IdeScreen handles the conditional rendering to ensure animations play.

  return (
    <View style={[
      styles.windowContainer, 
      { 
        backgroundColor: theme.bg, 
        borderColor: theme.border,
        borderWidth: 1, 
      }
    ]}>
      <View style={[styles.titleBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.controls}>
          {/* Red Button: Minimize */}
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#ff605c' }]} 
            onPress={onToggleMinimize}
          />
          {/* Yellow Button: Minimize */}
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#ffbd2e' }]} 
            onPress={onToggleMinimize} 
          />
          {/* Green Button: Maximize (Minimize others) */}
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#27c93f' }]} 
            onPress={onMaximize}
          />
        </View>
        <Text style={[styles.titleText, { color: theme.text }]}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.contentArea}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  windowContainer: { flex: 1, borderRadius: 10, borderWidth: 1, overflow: 'hidden', margin: 0 },
  titleBar: { height: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1 },
  contentArea: { flex: 1 },
  controls: { flexDirection: 'row', gap: 8, width: 60 },
  controlButton: { width: 12, height: 12, borderRadius: 6 },
  titleText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});