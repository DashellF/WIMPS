import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface EditorAction {
  label: string;
  onPress: () => void;
}

interface CodeEditorProps {
  code: string;
  setCode: (value: string) => void;
  actions: EditorAction[];
}

export function CodeEditor({ code, setCode, actions }: CodeEditorProps) {
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
          placeholderTextColor="#64748b"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 400,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  header: {
    gap: 12,
    marginBottom: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  actionsRow: {
    gap: 8,
    paddingRight: 12,
  },
  actionButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  editorShell: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  editorInput: {
    flex: 1,
    minHeight: 320,
    padding: 16,
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
});