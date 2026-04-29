// MemoryView.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function MemoryView({ data, theme }: any) {
  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Memory (Data Segment)</Text>
      <ScrollView>
        {data.map((item: any, index: number) => (
          <View key={index} style={styles.row}>
            <Text style={[styles.addr, { color: theme.subText }]}>{item.address}</Text>
            <Text style={[styles.val, { color: theme.text }]}>{item.value}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  addr: { fontFamily: 'monospace', fontSize: 12 },
  val: { fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold' },
});