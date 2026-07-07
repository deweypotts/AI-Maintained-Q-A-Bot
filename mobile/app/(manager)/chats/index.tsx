import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChatSummary } from '../../../types/chat';

// TODO: replace with a real backend call — chats where the technician's
// message triggered an escalation the manager hasn't resolved yet.
const mockChats: ChatSummary[] = [
  {
    id: '1',
    technicianName: 'Jordan Lee',
    lastMessagePreview: "I don't have an answer for that yet — looping in your manager.",
    escalated: true,
    updatedAt: new Date().toISOString(),
  },
];

export default function ChatsList() {
  return (
    <FlatList
      data={mockChats}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => router.push(`/(manager)/chats/${item.id}`)}>
          <View style={styles.rowContent}>
            <Text style={styles.name}>{item.technicianName}</Text>
            <Text style={styles.preview} numberOfLines={1}>
              {item.lastMessagePreview}
            </Text>
          </View>
          {item.escalated && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Needs you</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No active chats.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
  },
  rowContent: { flex: 1, marginRight: 8 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  preview: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  badge: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#B91C1C', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});
