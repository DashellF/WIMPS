import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  showHex?: boolean;
  toggleFormat?: () => void;
}

export function RegisterPanel({
  registers,
  theme,
  showHex = true,
  toggleFormat,
}: RegisterPanelProps) {
  const [query, setQuery] = useState('');
  const styles = getThemeStyles(theme);

  const filteredRegisters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return registers;

    return registers.filter((register) => {
      return (
        register.name.toLowerCase().includes(normalized) ||
        register.number.toString().includes(normalized) ||
        register.hexValue.toLowerCase().includes(normalized)
      );
    });
  }, [query, registers]);

  return (
    <View style={styles.outerWrapper}>
  {/* TABLE HEADER */}
  <View style={styles.tableHeader}>
    <View style={styles.nameColumn}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Filter registers..."
        placeholderTextColor={theme.subText}
        style={styles.headerSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>

    <Text style={[styles.headerCell, styles.numColumn]}>#</Text>

    <View style={styles.valueColumn}>
      <TouchableOpacity
        onPress={toggleFormat}
        style={styles.modeButton}
        activeOpacity={0.8}
      >
        <Text style={styles.modeButtonText}>
          {showHex ? 'HEX VALUE' : 'INT VALUE'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>

  {/* REGISTER LIST */}
  <View style={[styles.innerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      {filteredRegisters.map((register) => (
        <View
          key={register.name}
          style={[styles.row, { borderBottomColor: theme.border + '22' }]}
        >
          <View style={styles.nameColumn}>
            <Text style={[styles.nameText, { color: theme.text }]}>
              {register.name}
            </Text>
          </View>

          <Text
            style={[styles.rowText, styles.numColumn, { color: theme.subText }]}
          >
            {register.number}
          </Text>

          <Text
            style={[
              styles.rowText,
              styles.valueColumn,
              { color: theme.text, fontWeight: 'bold' },
            ]}
            numberOfLines={1}
          >
            {showHex
              ? register.hexValue
              : (parseInt(register.hexValue, 16) | 0).toString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  </View>
</View>
  );
}

const getThemeStyles = (theme: Theme) =>
  StyleSheet.create({
    outerWrapper: {
      flex: 1,
      backgroundColor: theme.bg,
      padding: 12,

    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 8,
      gap: 8,
    },
    headerCell: {
      color: theme.subText,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    headerSearch: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: theme.text,
      width: '100%',
    },
    innerCard: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      overflow: 'hidden',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
    },
    rowText: {
      fontFamily: 'monospace',
      fontSize: 12,
    },
    nameColumn: {
      flex: 1.2,
    },
    numColumn: {
      width: 30,
    },
    valueColumn: {
      flex: 1.4,
      textAlign: 'right',
    },
    nameText: {
      fontWeight: '700',
      fontSize: 12,
    },
    modeButton: {
      backgroundColor: '#2563eb',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 8,
      alignSelf: 'flex-end',
    },

    modeButtonText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '600',
    },
  });