import { BASE_URL } from './api';

const WS_URL = BASE_URL.replace(/^http/, 'ws') + '/ws';
const RECONNECT_DELAY_MS = 1500;

type Listener = () => void;

// Single shared connection for the whole app. Chat detail and inbox screens
// subscribe/unsubscribe as they mount/unmount; a new subscribeChat call
// replaces the previous chat subscription since only one chat screen is
// ever visible at a time.
class RealtimeClient {
  private ws: WebSocket | null = null;
  private chatId: string | null = null;
  private inboxListeners = new Set<Listener>();
  private chatListeners = new Set<Listener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private ensureConnected() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      if (this.chatId) this.send({ type: 'subscribeChat', chatId: this.chatId });
      if (this.inboxListeners.size > 0) this.send({ type: 'subscribeInbox' });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'chat-updated' && msg.chatId === this.chatId) {
          this.chatListeners.forEach((listener) => listener());
        } else if (msg.type === 'inbox-updated') {
          this.inboxListeners.forEach((listener) => listener());
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.reconnectTimer = setTimeout(() => this.ensureConnected(), RECONNECT_DELAY_MS);
    };

    ws.onerror = () => ws.close();
  }

  private send(payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  subscribeChat(chatId: string, listener: Listener) {
    this.chatId = chatId;
    this.chatListeners.add(listener);
    this.ensureConnected();
    this.send({ type: 'subscribeChat', chatId });

    return () => {
      this.chatListeners.delete(listener);
      if (this.chatId === chatId) this.chatId = null;
    };
  }

  subscribeInbox(listener: Listener) {
    this.inboxListeners.add(listener);
    this.ensureConnected();
    this.send({ type: 'subscribeInbox' });

    return () => {
      this.inboxListeners.delete(listener);
    };
  }
}

export const realtime = new RealtimeClient();
