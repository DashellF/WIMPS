import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { CodeEditor } from '../components/CodeEditor';
import { RegisterPanel, RegisterValue } from '../components/RegisterPanel';

const starterProgram = `.data
msg: .asciiz "Hello, WIMPS!"

.text
main:
  li $v0, 4
  la $a0, msg
  syscall

  li $v0, 10
  syscall
`;

const buildInitialRegisters = (): RegisterValue[] => {
  const names = [
    '$zero',
    '$at',
    '$v0',
    '$v1',
    '$a0',
    '$a1',
    '$a2',
    '$a3',
    '$t0',
    '$t1',
    '$t2',
    '$t3',
    '$t4',
    '$t5',
    '$t6',
    '$t7',
    '$s0',
    '$s1',
    '$s2',
    '$s3',
    '$s4',
    '$s5',
    '$s6',
    '$s7',
    '$t8',
    '$t9',
    '$k0',
    '$k1',
    '$gp',
    '$sp',
    '$fp',
    '$ra',
  ];

  return names.map((name, index) => ({
    name,
    number: index,
    hexValue: '0x00000000',
    decimalValue: '0',
  }));
};

export default function IdeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1000;

  const [code, setCode] = useState(starterProgram);
  const [registers] = useState<RegisterValue[]>(buildInitialRegisters());
  const [output, setOutput] = useState('Program output will appear here.');
  const [activeTab, setActiveTab] = useState<'editor' | 'registers' | 'console'>('editor');

  const editorActions = useMemo(
    () => [
      {
        label: 'Assemble',
        onPress: () => setOutput('Assemble clicked. Hook MARS-based assembler here.'),
      },
      {
        label: 'Run',
        onPress: () => setOutput('Run clicked. Hook simulator execution here.'),
      },
      {
        label: 'Step',
        onPress: () => setOutput('Step clicked. Hook single-step execution here.'),
      },
      {
        label: 'Reset',
        onPress: () => setOutput('Reset clicked. Reset registers, memory, and output here.'),
      },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>WIMPS IDE</Text>
            <Text style={styles.subtitle}>Web-first MIPS simulator UI starter</Text>
          </View>

          <View style={styles.topBarActions}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Docs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isWide && (
          <View style={styles.mobileTabs}>
            {(['editor', 'registers', 'console'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.mobileTab, activeTab === tab && styles.mobileTabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.mobileTabText,
                    activeTab === tab && styles.mobileTabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isWide ? (
          <View style={styles.desktopContent}>
            <View style={styles.editorColumn}>
              <CodeEditor code={code} setCode={setCode} actions={editorActions} />

              <View style={styles.consoleCard}>
                <Text style={styles.panelTitle}>Console Output</Text>
                <ScrollView style={styles.consoleOutput}>
                  <Text style={styles.consoleText}>{output}</Text>
                </ScrollView>
              </View>
            </View>

            <View style={styles.sideColumn}>
              <RegisterPanel registers={registers} />
            </View>
          </View>
        ) : (
          <View style={styles.mobileContent}>
            {activeTab === 'editor' && (
              <CodeEditor code={code} setCode={setCode} actions={editorActions} />
            )}

            {activeTab === 'registers' && <RegisterPanel registers={registers} />}

            {activeTab === 'console' && (
              <View style={styles.consoleCard}>
                <Text style={styles.panelTitle}>Console Output</Text>
                <ScrollView style={styles.consoleOutput}>
                  <Text style={styles.consoleText}>{output}</Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  container: {
    flex: 1,
    backgroundColor: '#0b1020',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  secondaryButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  desktopContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  editorColumn: {
    flex: 2.2,
    gap: 16,
  },
  sideColumn: {
    flex: 1,
  },
  mobileContent: {
    flex: 1,
  },
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 6,
    marginBottom: 12,
    gap: 6,
  },
  mobileTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  mobileTabActive: {
    backgroundColor: '#1e293b',
  },
  mobileTabText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  mobileTabTextActive: {
    color: '#f8fafc',
  },
  consoleCard: {
    flex: 1,
    minHeight: 160,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  panelTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  consoleOutput: {
    flex: 1,
  },
  consoleText: {
    color: '#cbd5e1',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});