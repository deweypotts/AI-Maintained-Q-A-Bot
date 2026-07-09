import { ChatSummary, KBEntry, Message, Role } from '../types/chat';

// On web this points at the backend running on the same machine. If you test
// on a physical device via Expo Go, swap this for your machine's LAN IP.
const BASE_URL = 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`${options?.method ?? 'GET'} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ApiUser {
  id: string;
  name: string;
  role: Role;
}

export function login(name: string, role: Role) {
  return request<{ user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, role }),
  });
}

export function fetchChat(chatId: string, role: Role) {
  return request<{ chat: { id: string; technicianName: string }; escalated: boolean; messages: Message[] }>(
    `/api/chats/${chatId}?role=${role}`
  );
}

export function sendMessage(chatId: string, sender: 'technician' | 'manager', text: string) {
  return request<{ messages: Message[]; escalated: boolean; prefill?: { question: string; answer: string } | null }>(
    `/api/chats/${chatId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ sender, text }),
    }
  );
}

export function fetchChatsList() {
  return request<{ chats: ChatSummary[] }>('/api/chats');
}

export function fetchMyChats(technicianId: string) {
  return request<{ chats: ChatSummary[] }>(`/api/chats?technicianId=${technicianId}`);
}

export function createChat(technicianId: string) {
  return request<{ chatId: string }>('/api/chats', {
    method: 'POST',
    body: JSON.stringify({ technicianId }),
  });
}

export function markChatRead(chatId: string) {
  return request<{ ok: true }>(`/api/chats/${chatId}/read`, { method: 'POST' });
}

export function fetchKBEntries() {
  return request<{ entries: KBEntry[] }>('/api/kb');
}

export function deleteKBEntry(id: string) {
  return request<{ ok: true }>(`/api/kb/${id}`, { method: 'DELETE' });
}

export function saveKBEntry(id: string, question: string, answer: string) {
  return request<{ ok: true }>(`/api/kb/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ question, answer }),
  });
}

export interface KBEditResponse {
  action: 'kept' | 'prefill' | 'updated';
  message: string;
  question?: string;
  answer?: string;
}

export function sendKBEditMessage(id: string, reply: string) {
  return request<KBEditResponse>(`/api/kb/${id}/message`, {
    method: 'POST',
    body: JSON.stringify({ reply }),
  });
}
