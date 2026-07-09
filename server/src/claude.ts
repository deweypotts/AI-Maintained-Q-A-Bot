import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MATCH_MODEL = 'claude-haiku-4-5-20251001';
const ANSWER_MODEL = 'claude-sonnet-5';

export interface KBCandidate {
  id: string;
  question: string;
  answer: string;
}

function firstToolInput(message: Anthropic.Message): Record<string, unknown> {
  const block = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  return (block?.input as Record<string, unknown>) ?? {};
}

export async function matchAgainstKB(
  question: string,
  candidates: KBCandidate[]
): Promise<{ matchId: string | null; answer: string | null }> {
  if (candidates.length === 0) return { matchId: null, answer: null };

  const list = candidates.map((c) => `id: ${c.id}\nQ: ${c.question}\nA: ${c.answer}`).join('\n\n');

  const message = await anthropic.messages.create({
    model: MATCH_MODEL,
    max_tokens: 512,
    tools: [
      {
        name: 'submit_match',
        description: 'Report whether an existing knowledge base entry answers the question.',
        input_schema: {
          type: 'object',
          properties: {
            matchId: { type: 'string', description: 'id of the matching KB entry, or empty string if none apply' },
            answer: {
              type: 'string',
              description: "answer to show the technician, phrased from the matched entry, or empty string if no match",
            },
          },
          required: ['matchId', 'answer'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_match' },
    messages: [
      {
        role: 'user',
        content: `A field technician asked: "${question}"\n\nExisting knowledge base entries:\n\n${list}\n\nDoes any entry genuinely answer this question (not just related topic)? Use submit_match.`,
      },
    ],
  });

  const input = firstToolInput(message) as { matchId?: string; answer?: string };
  return { matchId: input.matchId || null, answer: input.answer || null };
}

export async function draftKBEntries(conversation: string): Promise<Array<{ question: string; answer: string }>> {
  const message = await anthropic.messages.create({
    model: ANSWER_MODEL,
    max_tokens: 800,
    tools: [
      {
        name: 'submit_kb_entries',
        description: 'Propose one or more clean knowledge base entries summarizing the resolved conversation.',
        input_schema: {
          type: 'object',
          properties: {
            entries: {
              type: 'array',
              description:
                'One entry per distinct question covered in the conversation. Split into multiple entries if the technician and manager covered more than one unrelated topic — each entry must cover exactly one question and its answer.',
              items: {
                type: 'object',
                properties: {
                  question: {
                    type: 'string',
                    description:
                      'a generalized, reusable phrasing of the question — broaden overly specific wording to the ' +
                      'general category being asked about, so it also matches future differently-worded questions on ' +
                      'the same topic (e.g. "Do we have July 4th off?" becomes "What holidays do we have off?")',
                  },
                  answer: { type: 'string', description: "the manager's answer to that single question, cleaned up and generalized" },
                },
                required: ['question', 'answer'],
              },
            },
          },
          required: ['entries'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_kb_entries' },
    messages: [
      {
        role: 'user',
        content: `Here is a resolved chat between a technician and their manager:\n\n${conversation}\n\nSummarize this into one or more reusable knowledge base entries. If the technician asked about more than one distinct thing, split them into separate entries rather than merging them — each entry should cover exactly one question and one answer. Phrase each question at the general category level rather than the technician's exact wording, so it reads naturally for anyone asking about that topic (e.g. "Do we have July 4th off?" becomes "What holidays do we have off?").`,
      },
    ],
  });

  const input = firstToolInput(message) as { entries?: Array<{ question?: string; answer?: string }> };
  const entries = (input.entries ?? [])
    .map((e) => ({ question: e.question || '', answer: e.answer || '' }))
    .filter((e) => e.question && e.answer);

  return entries.length > 0 ? entries : [{ question: conversation.slice(0, 80), answer: '' }];
}

export async function detectsResolution(context: string, latestMessage: string): Promise<boolean> {
  const message = await anthropic.messages.create({
    model: MATCH_MODEL,
    max_tokens: 200,
    tools: [
      {
        name: 'submit_resolution_check',
        description: "Report whether the technician's latest message indicates their problem is resolved.",
        input_schema: {
          type: 'object',
          properties: {
            resolved: {
              type: 'boolean',
              description:
                "true if the technician's latest message indicates they're done with this topic — either clear " +
                'satisfaction/resolution ("thanks that worked", "got it, all set", "perfect, fixed") or a plain ' +
                'acknowledgment that doesn\'t ask another question or continue the conversation ("okay", "will do", ' +
                '"thanks", "sounds good"). false if they ask a new or follow-up question, or otherwise keep discussing the issue.',
            },
          },
          required: ['resolved'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_resolution_check' },
    messages: [
      {
        role: 'user',
        content: `Conversation so far:\n${context}\n\nTechnician's latest message: "${latestMessage}"\n\nIs the technician finished with this topic — either explicitly satisfied/resolved, or just acknowledging without asking anything further (e.g. "okay", "will do", "thanks")? Answer false if they're asking another question or continuing the discussion.`,
      },
    ],
  });
  const input = firstToolInput(message) as { resolved?: boolean };
  return Boolean(input.resolved);
}

export async function detectsYes(question: string, reply: string): Promise<boolean> {
  const message = await anthropic.messages.create({
    model: MATCH_MODEL,
    max_tokens: 200,
    tools: [
      {
        name: 'submit_yes_no',
        description: 'Report whether the reply is affirmative.',
        input_schema: {
          type: 'object',
          properties: { yes: { type: 'boolean' } },
          required: ['yes'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_yes_no' },
    messages: [
      { role: 'user', content: `Question asked: "${question}"\nReply: "${reply}"\n\nIs the reply affirmative?` },
    ],
  });
  const input = firstToolInput(message) as { yes?: boolean };
  return Boolean(input.yes);
}

export async function classifyEditReply(
  question: string,
  answer: string,
  reply: string
): Promise<{ intent: 'keep' | 'manual' | 'instruction'; instruction: string | null }> {
  const message = await anthropic.messages.create({
    model: MATCH_MODEL,
    max_tokens: 300,
    tools: [
      {
        name: 'submit_edit_intent',
        description: "Classify a manager's reply to being asked whether to save a knowledge base answer as-is or edit it.",
        input_schema: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              enum: ['keep', 'manual', 'instruction'],
              description:
                "'keep' if the manager wants to save the answer unchanged (e.g. \"save it\", \"looks good\", \"yes\"); " +
                "'manual' if they want to edit it themselves but gave no specific change (e.g. \"edit\", \"let me change it\", \"I'll edit\"); " +
                "'instruction' if they described a specific change to make (e.g. \"add that expenses must be submitted by the end of the month\")",
            },
            instruction: {
              type: 'string',
              description: "the specific change requested, only when intent is 'instruction'; empty string otherwise",
            },
          },
          required: ['intent', 'instruction'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_edit_intent' },
    messages: [
      {
        role: 'user',
        content: `Knowledge base entry:\nQ: ${question}\nA: ${answer}\n\nThe manager was asked: "Do you want me to save this answer? Or do you want to edit it?"\nManager's reply: "${reply}"\n\nClassify the reply using submit_edit_intent.`,
      },
    ],
  });
  const input = firstToolInput(message) as { intent?: string; instruction?: string };
  const intent = input.intent === 'manual' || input.intent === 'instruction' ? input.intent : 'keep';
  return { intent, instruction: input.instruction || null };
}

export async function reviseKBEntry(
  question: string,
  answer: string,
  feedback: string
): Promise<{ question: string; answer: string }> {
  const message = await anthropic.messages.create({
    model: ANSWER_MODEL,
    max_tokens: 500,
    tools: [
      {
        name: 'submit_kb_entry',
        description: 'Propose a revised knowledge base entry incorporating the requested change.',
        input_schema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
          },
          required: ['question', 'answer'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_kb_entry' },
    messages: [
      {
        role: 'user',
        content: `Current draft:\nQ: ${question}\nA: ${answer}\n\nManager's requested change: "${feedback}"\n\nProduce a revised Q&A incorporating this feedback.`,
      },
    ],
  });
  const input = firstToolInput(message) as { question?: string; answer?: string };
  return { question: input.question || question, answer: input.answer || answer };
}
