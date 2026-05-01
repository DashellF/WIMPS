import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Theme } from '../theme/themes';

const TAB = '    ';

export function CodeEditor({ code, setCode, actions, theme }: any) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showActionMenu, setShowActionMenu] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const styles = getThemeStyles(theme);

  const lines = code.split('\n');
  const lineCount = lines.length;

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: showActionMenu ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showActionMenu]);

  const handleKeyPress = (e: any) => {
    const { start, end } = selection;

    if (Platform.OS === 'web' && e.nativeEvent.key === 'Tab') {
      e.preventDefault();
      const newText = code.slice(0, start) + TAB + code.slice(end);
      setCode(newText);
      const next = start + TAB.length;
      setSelection({ start: next, end: next });
    }

    // 2. Handle Ctrl + Backspace
    if (
      Platform.OS === 'web' &&
      e.nativeEvent.key === 'Backspace' &&
      (e.nativeEvent.ctrlKey || e.nativeEvent.metaKey)
    ) {
      if (start !== end) return; 

      const textBeforeCursor = code.slice(0, start);
      const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
      const currentLineBeforeCursor = textBeforeCursor.slice(lastNewlineIndex + 1);

      if (currentLineBeforeCursor.length > 0) {
        // CASE A: Content exists on this line, delete the "chunk"
        e.preventDefault();
        const match = currentLineBeforeCursor.match(/(\s+||[^\s\w]+||\w+)$/);
        const deleteCount = match ? match[0].length : 0;
        const newText = code.slice(0, start - deleteCount) + code.slice(end);
        setCode(newText);
        const next = start - deleteCount;
        setSelection({ start: next, end: next });
      } else if (start > 0) {
        // CASE B: Line is empty, delete the newline and move up
        e.preventDefault();
        // Slice out the single \n character at the cursor position
        const newText = code.slice(0, start - 1) + code.slice(end);
        setCode(newText);
        const next = start - 1; 
        setSelection({ start: next, end: next });
      }
    }
  };

  return (
  <View style={styles.wrapper}>
    <View style={styles.floatingMenuArea}>
      <TouchableOpacity
  style={styles.menuToggleButton}
  onPress={() => setShowActionMenu((prev) => !prev)}
  activeOpacity={0.85}
>
  <Image
    source={require('../../assets/images/chevron_down.png')}
    style={[
      styles.chevronImage,
      {
        tintColor: theme.text,
        transform: [{ rotate: showActionMenu ? '180deg' : '0deg' }],
      },
    ]}
  />
</TouchableOpacity>

{showActionMenu && (
  <Animated.View
    style={[
      styles.floatingActionsRow,
      {
        opacity: menuAnim,
        transform: [
          {
            translateY: menuAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-6, 0],
            }),
          },
        ],
      },
    ]}
  >
    {actions.map((a: any) => (
      <TouchableOpacity
        key={a.label}
        style={styles.floatingActionButton}
        onPress={a.onPress}
      >
        {a.icon ? (
          <Image
            source={a.icon}
            style={[
              styles.actionIcon,
              { tintColor: theme.text },
            ]}
          />
        ) : (
          <Text style={styles.actionButtonText}>{a.label}</Text>
        )}
      </TouchableOpacity>
    ))}
  </Animated.View>
)}
    </View>

    <View style={styles.editorShell}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.gutter}>
          {Array.from({ length: lineCount }).map((_, i) => (
            <Text key={i} style={styles.lineNumber}>
              {i + 1}
            </Text>
          ))}
        </View>

        <TextInput
          value={code}
          onChangeText={setCode}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          scrollEnabled={false}
          style={styles.editorInput}
          selection={selection}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          onKeyPress={handleKeyPress}
        />
      </ScrollView>
    </View>
  </View>
);
}

const getThemeStyles = (theme: Theme) => StyleSheet.create({
  
  wrapper: { flex: 1, backgroundColor: theme.bg, padding: 14, borderWidth: 1, borderColor: theme.border },

  actionIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  actionButtonText: { 
    color: theme.text, 
    fontWeight: '600',
    fontSize: 11 
  },
  editorShell: { 
    flex: 1, 
    backgroundColor: theme.card, 
    borderRadius: 12, 
    overflow: 'visible', 
    borderWidth: 1, 
    borderColor: theme.border,
  },
  scrollContent: {
    flexDirection: 'row',
    minHeight: '100%',
  },
  gutter: {
    width: 45,
    backgroundColor: theme.bg,
    paddingTop: 16,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    // Ensure gutter height matches the input height
    paddingBottom: 100, 
  },
  lineNumber: {
    color: theme.subText,
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 22, // Sync with Input
    textAlign: 'right',
    paddingRight: 10,
  },
  editorInput: {
    flex: 1,
    padding: 16,
    paddingTop: 16,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'monospace',
    color: theme.text,
    textAlignVertical: 'top',
    minHeight: '100%'
  },
   floatingMenuArea: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
    elevation: 10,
    alignItems: 'flex-end',
    marginTop: 10,
    marginRight: 10
},

  floatingActionsRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },

  floatingActionButton: {
    backgroundColor: theme.bg,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border
  },

menuToggleButton: {
  backgroundColor: theme.bg,
  width: 44,
  height: 44,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: theme.border
},
chevronImage: {
  width: 28,
  height: 28,
  resizeMode: 'contain',
},
});