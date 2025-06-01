
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

const QuizItemSchema = z.object({
  question: z.string().describe('The plain text of the quiz question. No Markdown.'),
  options: z.array(z.string()).describe('An array of 2 to 5 plain text options for the quiz question. No Markdown or prefixes like (a), (b).'),
  correctAnswerIndex: z.number().int().min(0).describe('The 0-based index of the correct answer in the options array.'),
});

const GenerateFlashcardsAndQuizzesOutputSchema = z.object({
  flashcards: z.array(z.string()).describe('Array of flashcard strings, each formatted as "question:::answer" in plain text. No Markdown.'),
  quizzes: z.array(QuizItemSchema).describe('Array of quiz objects, each with a question, options array, and correctAnswerIndex. All text should be plain, without Markdown.')
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
  - CRITICAL: Flashcard questions and answers MUST be plain text, with no Markdown formatting symbols (like *, **, #, ##, -) or list markers.

  For quizzes:
  - Provide an array of quiz objects in the JSON output.
  - Each quiz object MUST have the following structure:
    {
      "question": "The plain text of the quiz question.",
      "options": ["Plain text for option 1", "Plain text for option 2", "Plain text for option 3", "Plain text for option 4"], // Array of 2-5 plain text strings
      "correctAnswerIndex": 0  // 0-based integer index of the correct answer in the 'options' array
    }
  - CRITICAL: The 'question' string and ALL strings within the 'options' array MUST be in PLAIN TEXT.
  - Do NOT include any Markdown formatting symbols (like *, **, #, ##, -) or list/choice markers (like (a), (b), 1., 2.) within the 'question' text or any of the 'options' text.

  Return the entire output in JSON format according to the defined output schema.
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
