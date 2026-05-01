import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function MemoryView({ data, theme }: any) {
  return (
    <View style={[styles.outerCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <View style={[styles.innerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          // ✅ Prevents ScrollView from expanding to fit all content —
          //    it will scroll within the available space instead
          style={styles.scrollView}
        >
          {data.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.subText }]}>Awaiting run...</Text>
          ) : (
            data.map((item: any, index: number) => (
              <View
                key={index}
                style={[styles.row, { borderBottomColor: theme.border + '22' }]}
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
    // ✅ flex: 1 lets it fill parent, but minHeight: 0 is the critical fix —
    //    without it, flex children in RN can expand past their parent's bounds
    flex: 1,
    minHeight: 0,
    padding: 12,
  },
  innerCard: {
    // ✅ Same here: flex: 1 + minHeight: 0 so this doesn't blow out its container
    flex: 1,
    minHeight: 0,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // ✅ ScrollView itself also needs flex: 1 + minHeight: 0 to stay within innerCard
  scrollView: {
    flex: 1,
    minHeight: 0,
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
  },
});