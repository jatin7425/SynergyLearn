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
  flashcards: z.array(z.string()).describe('The generated flashcards.'),
  quizzes: z.array(z.string()).describe('The generated quizzes.'),
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

  Please generate flashcards and quizzes from the notes provided. Return the flashcards and quizzes in JSON format.
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
