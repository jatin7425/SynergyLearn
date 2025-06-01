'use server';
/**
 * @fileOverview A support bot that answers user questions based on the application's README.md file.
 *
 * - getSupportBotResponse - A function that handles user queries and provides answers from the README.
 * - SupportBotInput - The input type for the getSupportBotResponse function.
 * - SupportBotOutput - The return type for the getSupportBotResponse function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fs from 'fs';
import path from 'path';

// Memoize README content to avoid reading the file on every request in the same server instance.
// This is a simple in-memory cache. For more robust caching, consider other strategies.
let readmeContentCache: string | null = null;
function getReadmeContent(): string {
  if (process.env.NODE_ENV === 'development' || !readmeContentCache) {
    try {
      const readmePath = path.join(process.cwd(), 'README.md');
      readmeContentCache = fs.readFileSync(readmePath, 'utf-8');
    } catch (error) {
      console.error('Failed to read README.md:', error);
      readmeContentCache = 'Error: The support document (README.md) could not be loaded. Please contact administrator.';
    }
  }
  return readmeContentCache;
}


const SupportBotInputSchema = z.object({
  userQuery: z.string().describe('The user\'s question about the SynergyLearn application.'),
});
export type SupportBotInput = z.infer<typeof SupportBotInputSchema>;

const SupportBotOutputSchema = z.object({
  botResponse: z.string().describe('The AI-generated answer based on the README.md content.'),
});
export type SupportBotOutput = z.infer<typeof SupportBotOutputSchema>;

export async function getSupportBotResponse(input: SupportBotInput): Promise<SupportBotOutput> {
  return supportBotFlow(input);
}

const supportBotPrompt = ai.definePrompt({
  name: 'supportBotPrompt',
  input: { schema: SupportBotInputSchema.extend({ readmeContent: z.string() }) },
  output: { schema: SupportBotOutputSchema },
  prompt: `You are a helpful and friendly support assistant for the SynergyLearn application.
Your knowledge base is strictly limited to the content of the document provided below.
Answer the user's question based ONLY on the information found in this document.
If the answer is not present in the document, clearly state that you don't have the information based on the provided context or that the README does not cover this specific topic.
Do not invent information or use any external knowledge.
Keep your answers concise and directly relevant to the user's query and the document's content.
If the user asks a general question not related to the app's functionality described in the document, politely state that you can only answer questions about SynergyLearn based on the provided README.

User's Question: "{{{userQuery}}}"

Document Content (README.md):
---
{{{readmeContent}}}
---

Based on the document, provide your answer:
`,
});

const supportBotFlow = ai.defineFlow(
  {
    name: 'supportBotFlow',
    inputSchema: SupportBotInputSchema,
    outputSchema: SupportBotOutputSchema,
  },
  async (input) => {
    const readmeText = getReadmeContent();
    if (readmeText.startsWith('Error:')) { // Handle case where README couldn't be loaded
        return { botResponse: readmeText };
    }

    const { output } = await supportBotPrompt({ ...input, readmeContent: readmeText });
    
    if (!output) {
        return { botResponse: "I'm sorry, I couldn't generate a response at this moment. Please try asking differently or check the README directly." };
    }
    return output;
  }
);
