import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/colors';
import { Message, Role } from '../types/chat';

interface MessageBubbleProps {
  message: Message;
  viewerRole: Role;
  otherPartyName?: string;
}

export function MessageBubble({ message, viewerRole, otherPartyName }: MessageBubbleProps) {
  if (message.sender === 'system') {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  // The bot answers on the manager's behalf, so from the manager's seat it
  // belongs on "our" side even though the manager didn't type it themselves.
  const isOwnSide =
    viewerRole === 'manager' ? message.sender === 'manager' || message.sender === 'bot' : message.sender === 'technician';
  const isSelfTyped = message.sender === viewerRole;
  const label =
    message.sender === 'bot' ? 'Applause Bot' : message.sender === 'manager' ? 'Manager' : otherPartyName ?? 'Technician';

  return (
    <View style={[styles.row, isOwnSide ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isSelfTyped && styles.ownBubble,
          message.sender === 'bot' && styles.botBubble,
          !isSelfTyped && message.sender === 'manager' && styles.managerBubble,
          !isSelfTyped && message.sender === 'technician' && styles.technicianBubble,
        ]}
      >
        {!isSelfTyped && <Text style={styles.senderLabel}>{label}</Text>}
        <Text style={isSelfTyped ? styles.ownText : styles.otherText}>{message.text}</Text>
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
    borderRadius: radii.bubble,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ownBubble: { backgroundColor: colors.primaryGreen },
  botBubble: { backgroundColor: '#E5E7EB' },
  managerBubble: { backgroundColor: colors.amberSoft },
  technicianBubble: { backgroundColor: '#E0F2FE' },
  ownText: { color: colors.white, fontSize: 15 },
  otherText: { color: colors.textPrimary, fontSize: 15 },
  senderLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 },
  unverifiedTag: { fontSize: 11, color: '#B45309', marginTop: 4, fontStyle: 'italic' },
  systemRow: { alignItems: 'center', marginVertical: 10 },
  systemText: {
    backgroundColor: colors.amberSoft,
    color: '#92400E',
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
