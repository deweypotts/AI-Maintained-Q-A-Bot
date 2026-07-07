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
  lastMessagePreview: string;
  escalated: boolean;
  updatedAt: string;
}

export interface PendingApproval {
  id: string;
  chatId: string;
  question: string;
  draftAnswer: string;
}
