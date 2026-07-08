import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { deleteKBEntry, fetchKBEntries } from '../lib/api';
import { colors, radii } from '../theme/colors';
import { KBEntry } from '../types/chat';

const POLL_INTERVAL_MS = 4000;

export function QAList() {
  const [entries, setEntries] = useState<KBEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchKBEntries();
      setEntries(result.entries);
    } catch {
      // TODO: surface a connection error banner
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleDelete = (item: KBEntry) => {
    const doDelete = async () => {
      await deleteKBEntry(item.id);
      setEntries((prev) => prev.filter((e) => e.id !== item.id));
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${item.question}"?`)) doDelete();
      return;
    }
    Alert.alert('Delete Q&A', `Delete "${item.question}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => router.push(`/chat/qa?id=${item.id}`)}>
          <View style={styles.rowContent}>
            <Text style={styles.question} numberOfLines={2}>
              {item.question}
            </Text>
            <Text style={styles.answer} numberOfLines={2}>
              {item.answer}
            </Text>
          </View>
          {item.status === 'pending' && (
            <View style={[styles.statusIcon, styles.statusPending]}>
              <Ionicons name="time" size={13} color={colors.white} />
            </View>
          )}
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No knowledge base entries yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowContent: { flex: 1, marginRight: 8 },
  question: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  answer: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  statusPending: { backgroundColor: colors.amber },
  deleteButton: { padding: 6 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
});
