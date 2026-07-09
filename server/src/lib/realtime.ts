import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

interface SocketMeta {
  chatId: string | null;
  inbox: boolean;
}

const sockets = new Map<WebSocket, SocketMeta>();

export function initRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    sockets.set(ws, { chatId: null, inbox: false });

    ws.on('message', (raw) => {
      const meta = sockets.get(ws);
      if (!meta) return;
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribeChat' && typeof msg.chatId === 'string') {
          meta.chatId = msg.chatId;
        } else if (msg.type === 'subscribeInbox') {
          meta.inbox = true;
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => sockets.delete(ws));
    ws.on('error', () => sockets.delete(ws));
  });
}

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

// A signal only — clients re-fetch via the existing REST endpoints, which
// already apply the right role-based visibility filtering. Keeps the
// realtime layer from having to duplicate that logic.
export function broadcastChatUpdate(chatId: string) {
  for (const [ws, meta] of sockets) {
    if (meta.chatId === chatId) send(ws, { type: 'chat-updated', chatId });
  }
}

export function broadcastInboxUpdate() {
  for (const [ws, meta] of sockets) {
    if (meta.inbox) send(ws, { type: 'inbox-updated' });
  }
}
