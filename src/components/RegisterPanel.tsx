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
      {/* OUTER HEADER SECTION */}
        <View style={styles.header}>
    <View style={styles.titleRow}>
      <Text style={[styles.title, { color: theme.text }]}>
        CPU Registers
      </Text>
    </View>
    {toggleFormat && (
  <TouchableOpacity onPress={toggleFormat} style={styles.hexToggle}>
    <Text style={{ color: theme.text, fontSize: 11 }}>
      {showHex ? 'HEX' : 'INT'}
    </Text>
  </TouchableOpacity>
)}

    <View style={styles.searchContainer}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Filter registers..."
        placeholderTextColor={theme.subText}
        style={styles.compactSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
        <Text style={[styles.headerCell, styles.numColumn]}>#</Text>
        <TouchableOpacity
          style={styles.valueColumn}
          onPress={toggleFormat}
          activeOpacity={0.7}
        >
          <Text style={[styles.headerCell, { textAlign: 'right' }]}>
            {showHex ? 'Hex Value' : 'Int Value'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.innerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ScrollView 
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredRegisters.map((register) => (
            <View key={register.name} style={[styles.row, { borderBottomColor: theme.border + '22' }]}>
              <View style={styles.nameColumn}>
                <Text style={[styles.nameText, { color: theme.text }]}>{register.name}</Text>
              </View>

              <Text style={[styles.rowText, styles.numColumn, { color: theme.subText }]}>
                {register.number}
              </Text>

              <Text
                style={[styles.rowText, styles.valueColumn, { color: theme.text, fontWeight: 'bold' }]}
                numberOfLines={1}
              >
                {showHex
                  ? register.hexValue
                  : String(parseInt(register.hexValue, 16))}
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginBottom: 16, // Increased margin for breathing room
      paddingHorizontal: 4,
    },
    compactSearch: {
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: theme.text,
        width: '60%',
        maxWidth: 180,
      },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      paddingBottom: 8,
    },
    headerCell: {
      color: theme.subText,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    searchContainer: {
  width: '60%',
  maxWidth: 180,
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
    decimalText: {
      fontSize: 10,
      fontFamily: 'monospace',
    },
hexToggle: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 6,
  marginLeft: 8,
},
  });