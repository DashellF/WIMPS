import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export interface RegisterValue {
  name: string;
  number: number;
  hexValue: string;
  decimalValue: string;
}

interface RegisterPanelProps {
  registers: RegisterValue[];
}

export function RegisterPanel({ registers }: RegisterPanelProps) {
  const [query, setQuery] = useState('');

  const filteredRegisters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return registers;

    return registers.filter((register) => {
      return (
        register.name.toLowerCase().includes(normalized) ||
        register.number.toString().includes(normalized) ||
        register.hexValue.toLowerCase().includes(normalized) ||
        register.decimalValue.toLowerCase().includes(normalized)
      );
    });
  }, [query, registers]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Registers</Text>
      <Text style={styles.subtitle}>Search and inspect current register values</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search registers..."
        placeholderTextColor="#64748b"
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
        <Text style={[styles.headerCell, styles.numColumn]}>#</Text>
        <Text style={[styles.headerCell, styles.valueColumn]}>Hex</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredRegisters.map((register) => (
          <View key={register.name} style={styles.row}>
            <View style={styles.nameColumn}>
              <Text style={styles.nameText}>{register.name}</Text>
              <Text style={styles.decimalText}>{register.decimalValue}</Text>
            </View>
            <Text style={[styles.rowText, styles.numColumn]}>{register.number}</Text>
            <Text style={[styles.rowText, styles.valueColumn]} numberOfLines={1}>
              {register.hexValue}
            </Text>
          </View>
        ))}
      </ScrollView>
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
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e2e8f0',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerCell: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#172033',
  },
  rowText: {
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  nameColumn: {
    flex: 1.2,
    paddingRight: 8,
  },
  numColumn: {
    width: 36,
  },
  valueColumn: {
    flex: 1.4,
  },
  nameText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 13,
  },
  decimalText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});