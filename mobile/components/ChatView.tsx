import { FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Message } from '../types/chat';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';

interface ChatViewProps {
  messages: Message[];
  onSend: (text: string) => void;
}

export function ChatView({ messages, onSend }: ChatViewProps) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.list}
      />
      <ChatInput onSend={onSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { paddingVertical: 12 },
});
