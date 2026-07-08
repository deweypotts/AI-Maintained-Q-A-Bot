import { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Message, Role } from '../types/chat';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';

interface ChatViewProps {
  messages: Message[];
  onSend: (text: string) => void;
  viewerRole: Role;
  otherPartyName?: string;
}

export function ChatView({ messages, onSend, viewerRole, otherPartyName }: ChatViewProps) {
  const listRef = useRef<FlatList<Message>>(null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} viewerRole={viewerRole} otherPartyName={otherPartyName} />
        )}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      <ChatInput onSend={onSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { paddingVertical: 12 },
});
