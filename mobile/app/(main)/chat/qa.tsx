import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatInput } from '../../../components/ChatInput';
import { MessageBubble } from '../../../components/MessageBubble';
import { fetchKBEntries, saveKBEntry, sendKBEditMessage } from '../../../lib/api';
import { colors, radii } from '../../../theme/colors';
import { KBEntry } from '../../../types/chat';

interface LocalMessage {
  id: string;
  sender: 'bot' | 'manager';
  text: string;
}

// Reconstructs "Q: ...\nA: ..." text (what we prefill the box with) back into
// separate fields. Falls back to treating the whole reply as the answer if
// the manager didn't keep the markers.
function parseQA(text: string, fallbackQuestion: string): { question: string; answer: string } {
  const match = text.match(/^Q:\s*([\s\S]*?)\n+A:\s*([\s\S]*)$/i);
  if (match) {
    return { question: match[1].trim(), answer: match[2].trim() };
  }
  return { question: fallbackQuestion, answer: text.trim() };
}

export default function EditQA() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [entry, setEntry] = useState<KBEntry | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [prefill, setPrefill] = useState<string | undefined>(undefined);
  const [awaitingManualEdit, setAwaitingManualEdit] = useState(false);
  const nextId = useRef(0);
  const seededRef = useRef(false);
  const listRef = useRef<FlatList<LocalMessage>>(null);

  const addMessage = (sender: 'bot' | 'manager', text: string) => {
    nextId.current += 1;
    const id = String(nextId.current);
    setMessages((prev) => [...prev, { id, sender, text }]);
  };

  useEffect(() => {
    // Dev-mode effects can fire twice on mount — without this guard the seed
    // messages (and their ids) would be duplicated in the list.
    if (!id || seededRef.current) return;
    seededRef.current = true;
    fetchKBEntries().then((result) => {
      const found = result.entries.find((e) => e.id === id);
      if (!found) return;
      setEntry(found);
      if (found.status === 'pending') {
        addMessage(
          'bot',
          `Q: ${found.question}\nA: ${found.answer}\n\nThis is a proposed Q&A. Do you want me to save it as is or do you want to edit?`
        );
      } else {
        addMessage('bot', `Q: ${found.question}\nA: ${found.answer}`);
        addMessage('bot', 'Do you want to edit it?');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSend = async (text: string) => {
    if (!id || !entry) return;
    addMessage('manager', text);

    if (awaitingManualEdit) {
      const { question, answer } = parseQA(text, entry.question);
      await saveKBEntry(id, question, answer);
      setEntry({ ...entry, question, answer });
      setAwaitingManualEdit(false);
      addMessage('bot', 'Saved.');
      return;
    }

    const result = await sendKBEditMessage(id, text);
    if (result.action === 'prefill') {
      setPrefill(`Q: ${result.question}\nA: ${result.answer}`);
      setAwaitingManualEdit(true);
      addMessage('bot', result.message);
    } else if (result.action === 'updated') {
      setEntry({ ...entry, question: result.question!, answer: result.answer! });
      addMessage('bot', `${result.message}\n\nQ: ${result.question}\nA: ${result.answer}`);
    } else {
      addMessage('bot', result.message);
    }
  };

  if (!entry) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/chat')}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          Edit Q&A
        </Text>
        <View style={styles.backButton} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={{ id: item.id, sender: item.sender, text: item.text, createdAt: '' }}
              viewerRole="manager"
            />
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <ChatInput onSend={handleSend} prefill={prefill} />
      </KeyboardAvoidingView>
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
  list: { paddingVertical: 12 },
});
