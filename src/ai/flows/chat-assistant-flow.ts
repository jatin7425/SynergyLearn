'use server';
/**
 * @fileOverview Provides AI assistance in a chat context for study rooms.
 * - getAIChatResponse - A function that generates an AI response to a user's query.
 * - ChatAssistantInput - The input type for the getAIChatResponse function.
 * - ChatAssistantOutput - The return type for the getAIChatResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ChatAssistantInputSchema = z.object({
  userQuery: z.string().describe('The query or message from the user directed to the AI assistant.'),
});
export type ChatAssistantInput = z.infer<typeof ChatAssistantInputSchema>;

export const ChatAssistantOutputSchema = z.object({
  aiResponse: z.string().describe('The AI-generated response to the user\'s query.'),
});
export type ChatAssistantOutput = z.infer<typeof ChatAssistantOutputSchema>;

export async function getAIChatResponse(input: ChatAssistantInput): Promise<ChatAssistantOutput> {
  return chatAssistantFlow(input);
}

const chatAssistantPrompt = ai.definePrompt({
  name: 'chatAssistantPrompt',
  input: {schema: ChatAssistantInputSchema},
  output: {schema: ChatAssistantOutputSchema},
  prompt: `You are a friendly and helpful AI Study Assistant in a collaborative chat room.
A student has invoked you using "@help_me" and provided the following query:
"{{{userQuery}}}"

Provide a concise, helpful, and encouraging response to assist the student.
If the query is unclear, very broad, or outside of a typical study context, you can ask for clarification or politely state that you cannot assist with that specific type of query.
Keep your answers suitable for a learning environment.
Do not use markdown in your response. Your response will be displayed as plain text in a chat message.
Focus on explaining concepts, offering study tips, or guiding them to resources if appropriate.
`,
});

const chatAssistantFlow = ai.defineFlow(
  {
    name: 'chatAssistantFlow',
    inputSchema: ChatAssistantInputSchema,
    outputSchema: ChatAssistantOutputSchema,
  },
  async (input) => {
    // Add a basic check for empty query, though the prompt also handles it.
    if (!input.userQuery.trim()) {
      return { aiResponse: "It looks like you asked for help but didn't provide a specific question. How can I assist you?" };
    }
    const {output} = await chatAssistantPrompt(input);
    if (!output) {
        return { aiResponse: "I'm sorry, I couldn't generate a response at this moment. Please try asking differently." };
    }
    return output;
  }
);
