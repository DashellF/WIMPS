import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import type { Theme } from '../theme/themes';


const TAB = '    '; // 2 spaces, or '    ' for 4

interface EditorAction {
  label: string;
  onPress: () => void;
}

interface CodeEditorProps {
  code: string;
  setCode: (value: string) => void;
  actions: EditorAction[];
  theme: Theme;
}


export function CodeEditor({ code, setCode, actions, theme }: CodeEditorProps) {
  const styles = getThemeStyles(theme); 
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Editor</Text>
          <Text style={styles.subtitle}>MIPS assembly source</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsRow}
        >
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionButton}
              onPress={action.onPress}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.editorShell}>
        <TextInput
          value={code}
          onChangeText={setCode}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          style={styles.editorInput}
          placeholder="Write MIPS code here..."
          placeholderTextColor={theme.subText}
          selection={selection}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          // Use onKeyPress instead of onKeyDown for better Web compatibility
          onKeyPress={(e) => {
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Tab') {
              // 1. Prevent default tab-switch behavior
              e.preventDefault();

              const { start, end } = selection;
              
              // 2. Calculate new string
              const newText = code.slice(0, start) + TAB + code.slice(end);
              const newCursorPos = start + TAB.length;

              // 3. Update text state immediately
              setCode(newText);

              // 4. Update selection state immediately 
              // By not using setTimeout, we tell React the new state AND 
              // the new selection in the same render cycle.
              setSelection({
                start: newCursorPos,
                end: newCursorPos,
              });
            }
          }}
        />
      </View>
    </View>
  );
}

const getThemeStyles = (theme: Theme) =>
  StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 400,
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    gap: 12,
    marginBottom: 12,
  },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.subText,
    fontSize: 13,
    marginTop: 2,
  },
  actionsRow: {
    gap: 8,
    paddingRight: 12,
  },
  actionButton: {
    backgroundColor: theme.btnBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  actionButtonText: {
    color: theme.text,
    fontWeight: '600',
  },
  editorShell: {
    flex: 1,
    backgroundColor: theme.bg,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  editorInput: {
    backgroundColor: theme.card,
    flex: 1,
    minHeight: 320,
    padding: 16,
    color: theme.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
});