import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatView } from '../../../components/ChatView';
import { useAuth } from '../../../context/AuthContext';
import { fetchChat, markChatRead, sendMessage } from '../../../lib/api';
import { colors, radii } from '../../../theme/colors';
import { Message } from '../../../types/chat';

const POLL_INTERVAL_MS = 3000;

export default function ChatDetail() {
  const { user } = useAuth();
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [technicianName, setTechnicianName] = useState('');
  const sendingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!chatId || !user || sendingRef.current) return;
    try {
      const result = await fetchChat(chatId, user.role);
      setMessages(result.messages);
      setTechnicianName(result.chat.technicianName);
    } catch {
      // TODO: surface a connection error banner
    }
  }, [chatId, user]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (chatId && user?.role === 'manager') markChatRead(chatId);
  }, [chatId, user?.role]);

  const handleSend = async (text: string) => {
    if (!chatId || !user) return;
    sendingRef.current = true;
    try {
      const result = await sendMessage(chatId, user.role, text);
      setMessages(result.messages);
    } finally {
      sendingRef.current = false;
    }
  };

  if (!user) return null;

  const title = user.role === 'manager' ? technicianName || 'Chat' : 'Chat';

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/chat')}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backButton} />
      </View>
      <ChatView
        messages={messages}
        onSend={handleSend}
        viewerRole={user.role}
        otherPartyName={user.role === 'manager' ? technicianName : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 14,
    backgroundColor: colors.primaryGreen,
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  backText: { color: colors.white, fontSize: 15, marginLeft: 2 },
  title: { fontSize: 18, fontWeight: '700', color: colors.white, flex: 1, textAlign: 'center' },
});
