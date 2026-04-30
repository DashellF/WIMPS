import React, { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Theme } from '../theme/themes';

const TAB = '    ';

export function CodeEditor({ code, setCode, actions, theme }: any) {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const styles = getThemeStyles(theme);

  const lines = code.split('\n');
  const lineCount = lines.length;
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
      {/* Header unchanged */}
      <View style={styles.actionsWrapper}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
    {actions.map((a: any) => (
      <TouchableOpacity key={a.label} style={styles.actionButton} onPress={a.onPress}>
        {a.icon ? (
        <Image 
          source={a.icon} 
          style={[
            styles.actionIcon, 
            { tintColor: theme.text }
          ]} 
        />
      ) : (
        <Text style={styles.actionButtonText}>{a.label}</Text>
      )}  
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

      {/* The Shell is the outer container. 
        We use a ScrollView as the primary container for the editor body.
      */}
      <View style={styles.editorShell}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* THE GUTTER */}
          <View style={styles.gutter}>
            {Array.from({ length: lineCount }).map((_, i) => (
              <Text key={i} style={styles.lineNumber}>
                {i + 1}
              </Text>
            ))}
          </View>

          {/* THE INPUT */}
          <TextInput
            value={code}
            onChangeText={setCode}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            // scrollEnabled={false} is critical here because the parent ScrollView 
            // handles the actual scrolling logic on Web/Mobile.
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
  //header: { gap: 12, marginBottom: 12 },
  //title: { color: theme.text, fontSize: 18, fontWeight: '700' },
  //subtitle: { color: theme.subText, fontSize: 13 },
  actionsRow: { 
  gap: 8,
  paddingRight: 16,
},
  actionsWrapper: {
  marginBottom: 12,
},
  actionButton: { 
    backgroundColor: theme.btnBg, 
    // Square dimensions for icons
    width: 44, 
    height: 44, 
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10
  },
  
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
    overflow: 'hidden', 
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
});