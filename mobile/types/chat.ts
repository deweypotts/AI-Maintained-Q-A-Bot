export type Role = 'technician' | 'manager';

export type MessageSender = 'technician' | 'bot' | 'manager' | 'system';

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  createdAt: string;
  unverified?: boolean;
}

export interface ChatSummary {
  id: string;
  technicianName: string;
  lastMessagePreview: string | null;
  resolved: boolean;
  hasUnread: boolean;
  updatedAt: string | null;
}

export type KBStatus = 'pending' | 'approved';

export interface KBEntry {
  id: string;
  question: string;
  answer: string;
  status: KBStatus;
  updatedAt: string;
}
