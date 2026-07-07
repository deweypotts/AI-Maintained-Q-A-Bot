import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ChatView } from '../../../components/ChatView';
import { Message } from '../../../types/chat';

let nextId = 1000;
const id = () => String(nextId++);

// TODO: replace with the real chat history for this technician, fetched by `id`.
const initialMessages: Message[] = [
  { id: id(), sender: 'technician', text: 'The torque wrench in bay 3 keeps resetting to zero mid-job.', createdAt: new Date().toISOString() },
  {
    id: id(),
    sender: 'bot',
    text: "I don't have an answer for that yet — looping in your manager.",
    createdAt: new Date().toISOString(),
    unverified: true,
  },
  { id: id(), sender: 'system', text: 'Manager brought into the chat.', createdAt: new Date().toISOString() },
];

export default function ManagerChatDetail() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const handleSend = (text: string) => {
    // TODO: post this as the manager's reply for chat `chatId` via the backend
    const managerMessage: Message = {
      id: id(),
      sender: 'manager',
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, managerMessage]);
  };

  return <ChatView messages={messages} onSend={handleSend} />;
}
