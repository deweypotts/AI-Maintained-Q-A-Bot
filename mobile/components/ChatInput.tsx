import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';

interface ChatInputProps {
  onSend: (text: string) => void;
  prefill?: string;
}

export function ChatInput({ onSend, prefill }: ChatInputProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (prefill) setText(prefill);
  }, [prefill]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyPress = (e: any) => {
    // Web fires real key events through onKeyPress; native return-key
    // presses land in onSubmitEditing instead. Shift+Enter still inserts
    // a newline since we only send on a bare Enter.
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      handleSend();
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Ask a question..."
        placeholderTextColor="#9CA3AF"
        multiline
        onSubmitEditing={handleSend}
        onKeyPress={handleKeyPress}
        blurOnSubmit={false}
      />
      <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={!text.trim()}>
        <Text style={styles.sendText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendText: { color: colors.white, fontWeight: '600' },
});
