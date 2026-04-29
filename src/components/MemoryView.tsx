// MemoryView.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function MemoryView({ data, theme }: any) {
  return (
    <View style={[styles.outerCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>System Memory</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.subText }]}>0x10010000 (Data)</Text>
      </View>

      {/* INNER CONTENT CARD */}
      <View style={[styles.innerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {data.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.subText }]}>Awaiting run...</Text>
          ) : (
            data.map((item: any, index: number) => (
              <View 
                key={index} 
                style={[
                  styles.row, 
                  { borderBottomColor: theme.border + '22' } 
                ]}
              >
                <Text style={[styles.addr, { color: theme.subText }]}>{item.address}</Text>
                <Text style={[styles.val, { color: theme.text }]}>{item.value}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12, // This creates the "Frame" around the inner card
  },
  header: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
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
  subtitle: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  innerCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden', // Ensures scroll content doesn't bleed over corners
  },
  scrollContent: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  addr: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  val: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 11,
    fontStyle: 'italic',
  }
});