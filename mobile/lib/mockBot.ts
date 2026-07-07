// Stand-in for the real backend chat endpoint. Swap for lib/api.ts once the
// server can actually search the knowledge base and talk to Claude.

export interface BotReply {
  text: string;
  resolved: boolean;
}

const KNOWN_ANSWERS: Array<{ pattern: RegExp; answer: string }> = [
  {
    pattern: /reset.*(password|login)|forgot.*password/i,
    answer: 'To reset your login, go to Settings > Account > Reset Password.',
  },
  {
    pattern: /wifi|network/i,
    answer: "Restart the router, then reconnect using the network named 'FieldOps'.",
  },
];

export function getBotResponse(question: string): BotReply {
  const match = KNOWN_ANSWERS.find(({ pattern }) => pattern.test(question));
  if (match) {
    return { text: match.answer, resolved: true };
  }
  return {
    text: "I don't have an answer for that yet — looping in your manager.",
    resolved: false,
  };
}
