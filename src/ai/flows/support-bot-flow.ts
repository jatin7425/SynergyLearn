
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
  prompt: `You are a friendly and helpful support assistant for the SynergyLearn application.
Your knowledge base is strictly limited to the content of the document provided below (the application's README).
Your goal is to answer the user's question in a conversational and easy-to-understand way, based ONLY on the information found in this document.

When answering:
1.  Rephrase information from the document into clear, step-by-step instructions if applicable.
2.  Speak like a helpful assistant, not like you are quoting a document. For example, instead of saying "Navigate to /notes/new", you might say "You can create a new note by going to the 'Notes' section and looking for a 'New Note' button."
3.  Avoid directly quoting technical paths (like /notes/new) or overly literal UI element names from the document unless it's essential for clarity and rephrased.
4.  Do NOT mention the document itself (e.g., do not say "According to the README..." or "The document states..."). Assume the user knows you are using this information.
5.  If the answer is not present in the document, clearly state that you don't have information on that specific topic or that the application's guide doesn't cover it.
6.  Do not invent information or use any external knowledge.
7.  Keep your answers concise and directly relevant to the user's query.
8.  If the user asks a general question not related to the app's functionality described in the document, politely state that you can only answer questions about SynergyLearn based on the provided information.

User's Question: "{{{userQuery}}}"

Document Content (README.md):
---
{{{readmeContent}}}
---

Based *only* on the document content, provide your helpful, conversational answer to the user's question:
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

