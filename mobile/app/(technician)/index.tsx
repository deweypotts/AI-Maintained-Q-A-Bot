import { useState } from 'react';
import { ChatView } from '../../components/ChatView';
import { getBotResponse } from '../../lib/mockBot';
import { Message } from '../../types/chat';

let nextId = 1;
const id = () => String(nextId++);

const initialMessages: Message[] = [
  {
    id: id(),
    sender: 'bot',
    text: "Hi! I'm the Applause bot. Ask me anything about the job — if I don't know, I'll bring in your manager.",
    createdAt: new Date().toISOString(),
  },
];

export default function TechnicianChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [escalated, setEscalated] = useState(false);

  const handleSend = (text: string) => {
    const technicianMessage: Message = {
      id: id(),
      sender: 'technician',
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, technicianMessage]);

    // TODO: replace with a real backend call once server chat endpoint exists
    const reply = getBotResponse(text);
    const botMessage: Message = {
      id: id(),
      sender: 'bot',
      text: reply.text,
      createdAt: new Date().toISOString(),
      unverified: !reply.resolved,
    };

    setMessages((prev) => [...prev, botMessage]);

    if (!reply.resolved && !escalated) {
      setEscalated(true);
      const systemMessage: Message = {
        id: id(),
        sender: 'system',
        text: 'Manager brought into the chat.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    }
  };

  return <ChatView messages={messages} onSend={handleSend} />;
}
