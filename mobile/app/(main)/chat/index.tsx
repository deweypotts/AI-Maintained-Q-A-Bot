import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatInboxList } from '../../../components/ChatInboxList';
import { QAList } from '../../../components/QAList';
import { useAuth } from '../../../context/AuthContext';
import { createChat, fetchChatsList, fetchMyChats } from '../../../lib/api';
import { colors, radii } from '../../../theme/colors';

type ManagerTab = 'chats' | 'qa';

function ManagerChatHome() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ManagerTab>('chats');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Manager</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, tab === 'chats' && styles.toggleButtonActive]}
            onPress={() => setTab('chats')}
          >
            <Text style={[styles.toggleText, tab === 'chats' && styles.toggleTextActive]}>Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, tab === 'qa' && styles.toggleButtonActive]}
            onPress={() => setTab('qa')}
          >
            <Text style={[styles.toggleText, tab === 'qa' && styles.toggleTextActive]}>Q&As</Text>
          </TouchableOpacity>
        </View>
      </View>
      {tab === 'chats' ? (
        <ChatInboxList
          fetchChats={fetchChatsList}
          onSelectChat={(id) => router.push(`/chat/${id}`)}
          titleField="technicianName"
          emptyText="No active chats."
          hideHeader
        />
      ) : (
        <QAList />
      )}
    </View>
  );
}

export default function ChatInbox() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'manager') {
    return <ManagerChatHome />;
  }

  const handleNewChat = async () => {
    const { chatId } = await createChat(user.id);
    router.push(`/chat/${chatId}`);
  };

  return (
    <ChatInboxList
      title="Technician"
      fetchChats={() => fetchMyChats(user.id)}
      onSelectChat={(id) => router.push(`/chat/${id}`)}
      onNewChat={handleNewChat}
      titleField="managerName"
      emptyText="No conversations yet — tap + to ask a question."
    />
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primaryGreen,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
  },
  headerTitle: { color: colors.white, fontSize: 24, fontWeight: '700', marginBottom: 14 },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.pill,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  toggleButtonActive: { backgroundColor: colors.white },
  toggleText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  toggleTextActive: { color: colors.primaryGreenDark },
});
