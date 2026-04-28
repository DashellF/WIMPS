import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Theme } from '../theme/themes';

export interface RegisterValue {
  name: string;
  number: number;
  hexValue: string;
  decimalValue?: string;
}

interface RegisterPanelProps {
  registers: RegisterValue[];
  theme: Theme;
}

export function RegisterPanel({ registers, theme }: RegisterPanelProps) {
  const [query, setQuery] = useState('');
  const styles = getThemeStyles(theme);

  const filteredRegisters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return registers;

    return registers.filter((register) => {
      return (
        register.name.toLowerCase().includes(normalized) ||
        register.number.toString().includes(normalized) ||
        register.hexValue.toLowerCase().includes(normalized) ||
        (register.decimalValue?.toLowerCase().includes(normalized) ?? false)
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
        placeholderTextColor={theme.subText}
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
              {register.decimalValue !== undefined && (
                <Text style={styles.decimalText}>{register.decimalValue}</Text>
              )}
            </View>

            <Text style={[styles.rowText, styles.numColumn]}>
              {register.number}
            </Text>

            <Text
              style={[styles.rowText, styles.valueColumn]}
              numberOfLines={1}
            >
              {register.hexValue}
            </Text>
          </View>
        ))}
      </ScrollView>
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
    title: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '700',
    },
    subtitle: {
      color: theme.subText,
      fontSize: 13,
      marginTop: 4,
      marginBottom: 12,
    },
    searchInput: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.text,
      marginBottom: 12,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingBottom: 8,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerCell: {
      color: theme.subText,
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
      borderBottomColor: theme.border,
    },
    rowText: {
      color: theme.text,
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
      color: theme.text,
      fontWeight: '700',
      fontSize: 13,
    },
    decimalText: {
      color: theme.subText,
      fontSize: 12,
      marginTop: 2,
      fontFamily: 'monospace',
    },
  });