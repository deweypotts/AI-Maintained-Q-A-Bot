import { StyleSheet, Text, View } from 'react-native';
import { Message } from '../types/chat';

export function MessageBubble({ message }: { message: Message }) {
  if (message.sender === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  const isTechnician = message.sender === 'technician';

  return (
    <View style={[styles.row, isTechnician ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          message.sender === 'technician' && styles.technicianBubble,
          message.sender === 'bot' && styles.botBubble,
          message.sender === 'manager' && styles.managerBubble,
        ]}
      >
        {message.sender !== 'technician' && (
          <Text style={styles.senderLabel}>
            {message.sender === 'bot' ? 'Applause Bot' : 'Manager'}
          </Text>
        )}
        <Text style={isTechnician ? styles.technicianText : styles.otherText}>{message.text}</Text>
        {message.unverified && <Text style={styles.unverifiedTag}>Unverified — awaiting review</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  technicianBubble: { backgroundColor: '#2563EB' },
  botBubble: { backgroundColor: '#E5E7EB' },
  managerBubble: { backgroundColor: '#DCFCE7' },
  technicianText: { color: '#FFFFFF', fontSize: 15 },
  otherText: { color: '#111827', fontSize: 15 },
  senderLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 2 },
  unverifiedTag: { fontSize: 11, color: '#B45309', marginTop: 4, fontStyle: 'italic' },
  systemRow: { alignItems: 'center', marginVertical: 10 },
  systemText: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
