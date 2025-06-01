'use server';
/**
 * @fileOverview Provides AI-powered chat summarization for study rooms.
 * - getChatSummary - A function that generates a summary of a chat discussion.
 * - ChatSummaryInput - The input type for the getChatSummary function.
 * - ChatSummaryOutput - The return type for the getChatSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
  userName: z.string().describe('The name of the user who sent the message.'),
  text: z.string().describe('The content of the message.'),
});

const ChatSummaryInputSchema = z.object({
  messages: z.array(ChatMessageSchema).describe('An array of chat messages to be summarized. Should be in chronological order.'),
});
export type ChatSummaryInput = z.infer<typeof ChatSummaryInputSchema>;

const ChatSummaryOutputSchema = z.object({
  summary: z.string().describe('The AI-generated summary of the chat discussion.'),
});
export type ChatSummaryOutput = z.infer<typeof ChatSummaryOutputSchema>;

export async function getChatSummary(input: ChatSummaryInput): Promise<ChatSummaryOutput> {
  return summarizeChatFlow(input);
}

const summarizeChatPrompt = ai.definePrompt({
  name: 'summarizeChatPrompt',
  input: {schema: ChatSummaryInputSchema},
  output: {schema: ChatSummaryOutputSchema},
  prompt: `You are an AI assistant in a collaborative study room. Your task is to summarize the following chat discussion.
Focus on the key topics, main questions asked, important points made, and any conclusions reached.
The summary should be concise and help someone quickly understand what has been discussed.
Do not use markdown in your response.

Chat History:
{{#each messages}}
- {{userName}}: {{{text}}}
{{/each}}

Provide your summary:
`,
});

const summarizeChatFlow = ai.defineFlow(
  {
    name: 'summarizeChatFlow',
    inputSchema: ChatSummaryInputSchema,
    outputSchema: ChatSummaryOutputSchema,
  },
  async (input) => {
    if (input.messages.length === 0) {
      return { summary: "There are no messages to summarize." };
    }
    const {output} = await summarizeChatPrompt(input);
    if (!output) {
        return { summary: "I'm sorry, I couldn't generate a summary at this moment." };
    }
    return output;
  }
);
