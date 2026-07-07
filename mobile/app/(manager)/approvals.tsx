import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PendingApproval } from '../../types/chat';

// TODO: replace with real pending KB entries drafted by the AI after an
// episode resolves (manager taps "Mark resolved" in a chat).
const initialApprovals: PendingApproval[] = [
  {
    id: 'a1',
    chatId: '1',
    question: 'Torque wrench in bay 3 keeps resetting to zero mid-job',
    draftAnswer:
      'This happens when the battery is under 20%. Swap the battery pack before starting the job — a low charge causes the calibration to drop.',
  },
];

export default function Approvals() {
  const [approvals, setApprovals] = useState(initialApprovals);

  const handleApprove = (item: PendingApproval) => {
    // TODO: call backend to publish this into the knowledge base
    setApprovals((prev) => prev.filter((a) => a.id !== item.id));
  };

  const handleDismiss = (item: PendingApproval) => {
    // TODO: call backend to discard the draft
    setApprovals((prev) => prev.filter((a) => a.id !== item.id));
  };

  return (
    <FlatList
      data={approvals}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.question}>{item.question}</Text>
          <Text style={styles.answer}>{item.draftAnswer}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.dismissButton} onPress={() => handleDismiss(item)}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(item)}>
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>Nothing waiting on you.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  question: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  answer: { fontSize: 14, color: '#374151', lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  dismissButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dismissText: { color: '#6B7280', fontWeight: '600' },
  approveButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#16A34A' },
  approveText: { color: '#FFFFFF', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});
