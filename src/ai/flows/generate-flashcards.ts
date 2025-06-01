
// src/ai/flows/generate-flashcards.ts
'use server';
/**
 * @fileOverview Generates flashcards and quizzes from user notes.
 *
 * - generateFlashcardsAndQuizzes - A function that generates flashcards and quizzes from user notes.
 * - GenerateFlashcardsAndQuizzesInput - The input type for the generateFlashcardsAndQuizzes function.
 * - GenerateFlashcardsAndQuizzesOutput - The return type for the generateFlashcardsAndQuizzes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFlashcardsAndQuizzesInputSchema = z.object({
  notes: z.string().describe('The notes to generate flashcards and quizzes from.'),
});
export type GenerateFlashcardsAndQuizzesInput = z.infer<
  typeof GenerateFlashcardsAndQuizzesInputSchema
>;

const GenerateFlashcardsAndQuizzesOutputSchema = z.object({
  flashcards: z.array(z.string()).describe('Array of flashcard strings, each formatted as "question:::answer" in plain text.'),
  quizzes: z.array(z.string()).describe('Array of quiz item strings, each being a block of plain text containing the question, options, and answer if applicable.')
});
export type GenerateFlashcardsAndQuizzesOutput = z.infer<
  typeof GenerateFlashcardsAndQuizzesOutputSchema
>;

export async function generateFlashcardsAndQuizzes(
  input: GenerateFlashcardsAndQuizzesInput
): Promise<GenerateFlashcardsAndQuizzesOutput> {
  return generateFlashcardsAndQuizzesFlow(input);
}

const generateFlashcardsAndQuizzesPrompt = ai.definePrompt({
  name: 'generateFlashcardsAndQuizzesPrompt',
  input: {schema: GenerateFlashcardsAndQuizzesInputSchema},
  output: {schema: GenerateFlashcardsAndQuizzesOutputSchema},
  prompt: `You are an AI assistant designed to generate flashcards and quizzes from user notes.

  Notes: {{{notes}}}

  Generate flashcards and quizzes based on the notes.

  For flashcards:
  - Each flashcard should have a question and an answer.
  - The question and answer should be in PLAIN TEXT.
  - Separate the question and answer with ":::".
  - Provide flashcards as an array of strings in the JSON output, where each string is "question:::answer".

  For quizzes:
  - Each quiz item should be a single block of PLAIN TEXT. This block can contain the question, any multiple-choice options (if any), and the answer.
  - Provide quiz items as an array of plain text strings in the JSON output.

  CRITICAL FORMATTING RULE: For all generated content (flashcard questions, flashcard answers, and the entire text for each quiz item), you MUST use PLAIN TEXT ONLY. Do NOT include any Markdown formatting symbols (like *, **, #, ##, -) or list/choice markers (like (a), (b), 1., 2.) within the text.

  Return the output in JSON format according to the defined output schema.
  `,
});

const generateFlashcardsAndQuizzesFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsAndQuizzesFlow',
    inputSchema: GenerateFlashcardsAndQuizzesInputSchema,
    outputSchema: GenerateFlashcardsAndQuizzesOutputSchema,
  },
  async input => {
    const {output} = await generateFlashcardsAndQuizzesPrompt(input);
    return output!;
  }
);

