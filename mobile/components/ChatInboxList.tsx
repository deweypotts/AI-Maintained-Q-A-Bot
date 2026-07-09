import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { realtime } from '../lib/socket';
import { colors, radii } from '../theme/colors';
import { ChatSummary } from '../types/chat';

interface ChatInboxListProps {
  title?: string;
  fetchChats: () => Promise<{ chats: ChatSummary[] }>;
  onSelectChat: (id: string) => void;
  onNewChat?: () => void;
  onDeleteChat?: (id: string) => Promise<unknown>;
  titleField: 'technicianName' | 'managerName';
  emptyText: string;
  hideHeader?: boolean;
}

// A safety-net fallback in case the socket connection drops — pushes over
// the socket (see subscribeInbox below) are what make updates feel instant.
const POLL_INTERVAL_MS = 15000;

export function ChatInboxList({
  title,
  fetchChats,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  titleField,
  emptyText,
  hideHeader,
}: ChatInboxListProps) {
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatSummary[]>([]);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchChats();
      setChats(result.chats);
    } catch {
      // TODO: surface a connection error banner
    }
  }, [fetchChats]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    return realtime.subscribeInbox(refresh);
  }, [refresh]);

  const handleDelete = useCallback(
    (item: ChatSummary) => {
      if (!onDeleteChat) return;
      const doDelete = async () => {
        setChats((prev) => prev.filter((c) => c.id !== item.id));
        try {
          await onDeleteChat(item.id);
        } catch {
          refresh();
        }
      };
      if (Platform.OS === 'web') {
        if (window.confirm(`Delete this conversation with ${item[titleField]}?`)) doDelete();
        return;
      }
      Alert.alert('Delete conversation?', `This removes your chat with ${item[titleField]}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    },
    [onDeleteChat, titleField, refresh]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {!hideHeader && (
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>{title}</Text>
          {onNewChat && (
            <TouchableOpacity style={styles.newButton} onPress={onNewChat}>
              <Ionicons name="add" size={26} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => onSelectChat(item.id)}>
            {item.hasUnread && <View style={styles.unreadDot} />}
            <View style={styles.rowContent}>
              <Text style={[styles.name, item.hasUnread && styles.nameUnread]} numberOfLines={1}>
                {item[titleField]}
              </Text>
              <Text style={[styles.preview, item.hasUnread && styles.previewUnread]} numberOfLines={1}>
                {item.lastMessagePreview ?? 'New conversation'}
              </Text>
            </View>
            {onDeleteChat && (
              <TouchableOpacity
                style={styles.deleteButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryGreen,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
  },
  headerTitle: { color: colors.white, fontSize: 24, fontWeight: '700' },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blueAccent, marginRight: 10 },
  rowContent: { flex: 1, marginRight: 8 },
  deleteButton: { padding: 4 },
  name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  nameUnread: { fontWeight: '700' },
  preview: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  previewUnread: { color: colors.textPrimary, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
});
