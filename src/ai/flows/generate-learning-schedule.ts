
'use server';
/**
 * @fileOverview Generates a personalized learning schedule.
 *
 * - generateLearningSchedule - A function that creates a learning schedule based on user inputs.
 * - GenerateLearningScheduleInput - The input type for the generateLearningSchedule function.
 * - GenerateLearningScheduleOutput - The return type for the generateLearningSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLearningScheduleInputSchema = z.object({
  learningGoal: z.string().describe('The primary learning goal of the user.'),
  scheduleDuration: z.enum(['1 month', '1 year', '2 years']).describe('The desired duration for the learning schedule.'),
  dailyAvailability: z.string().describe('User\'s daily availability for study. Examples: "9 AM to 5 PM", "evenings 7 PM to 10 PM", "3 hours per day flexible".'),
  weeklyHolidays: z.string().optional().describe('Days of the week the user takes off. Example: "Saturday, Sunday". If empty, assume 7 days a week study.'),
  utilizeHolidays: z.boolean().describe('Whether the user wants to utilize their weekly holidays for learning if needed to meet the goal within the duration.'),
  startDate: z.string().describe('The start date for the schedule in YYYY-MM-DD format. This is for the AI to calculate dates correctly.'),
});
export type GenerateLearningScheduleInput = z.infer<typeof GenerateLearningScheduleInputSchema>;

const DailyTaskSchema = z.object({
  date: z.string().describe('The date for this task in YYYY-MM-DD format.'),
  dayOfWeek: z.string().describe('The day of the week (e.g., Monday, Tuesday).'),
  topic: z.string().describe('The specific topic or subject to study for the day. Could be "Review previous topics" or "Rest Day" if applicable.'),
  estimatedDuration: z.string().optional().describe('Estimated time to spend on this topic (e.g., "2 hours", "1.5 hours").'),
  timeSlot: z.string().optional().describe('Suggested time slot if derivable from availability (e.g., "9 AM - 11 AM"). If availability is just "3 hours", this might be less specific.'),
});

const GenerateLearningScheduleOutputSchema = z.object({
  schedule: z.array(DailyTaskSchema).describe('An array of daily learning tasks, structured chronologically.'),
  summary: z.string().optional().describe('A brief summary or overview of the generated schedule.'),
});
export type GenerateLearningScheduleOutput = z.infer<typeof GenerateLearningScheduleOutputSchema>;

export async function generateLearningSchedule(input: GenerateLearningScheduleInput): Promise<GenerateLearningScheduleOutput> {
  return generateLearningScheduleFlow(input);
}

const generateLearningSchedulePrompt = ai.definePrompt({
  name: 'generateLearningSchedulePrompt',
  input: {schema: GenerateLearningScheduleInputSchema},
  output: {schema: GenerateLearningScheduleOutputSchema},
  prompt: `You are an AI expert in creating personalized learning schedules.
Your task is to generate a structured learning schedule based on the user's inputs.
The schedule should break down the learning goal into manageable daily tasks over the specified duration.

User Inputs:
- Learning Goal: {{{learningGoal}}}
- Schedule Duration: {{{scheduleDuration}}}
- Daily Availability: {{{dailyAvailability}}}
- Weekly Holidays: {{#if weeklyHolidays}}"{{{weeklyHolidays}}}"{{else}}"None specified (assume 7 days study)"{{/if}}
- Utilize Holidays for Learning: {{{utilizeHolidays}}}
- Schedule Start Date: {{{startDate}}}

Instructions:
1.  **Understand the Goal:** Break down the '{{{learningGoal}}}' into logical sub-topics or modules that can be distributed over the '{{{scheduleDuration}}}'.
2.  **Respect Availability:** Allocate study time according to '{{{dailyAvailability}}}'.
    - If specific times are given (e.g., "9 AM to 5 PM"), try to infer possible time slots for tasks.
    - If general duration is given (e.g., "3 hours per day"), this can be more flexible in the 'timeSlot' field.
3.  **Handle Holidays:**
    - If '{{{weeklyHolidays}}}' are specified and '{{{utilizeHolidays}}}' is false, these days should generally be "Rest Day" or "Catch-up Day".
    - If '{{{utilizeHolidays}}}' is true, these days can be used for regular study, especially if the goal is ambitious for the duration.
4.  **Structure Output:**
    - Return an array of 'DailyTask' objects. Each object must include:
        - 'date': The specific date for the task (YYYY-MM-DD format), starting from '{{{startDate}}}'.
        - 'dayOfWeek': The corresponding day of the week.
        - 'topic': The specific topic to study. Make this actionable. Include "Review" sessions periodically. Some days might be "Rest Day" or "Buffer/Catch-up".
        - 'estimatedDuration': An estimate like "1 hour", "2.5 hours". This should align with daily availability.
        - 'timeSlot': A suggested time (e.g., "10 AM - 12 PM") if it can be reasonably inferred from availability. Otherwise, it can be more general or omitted.
5.  **Topic Progression:** Ensure topics flow logically. Introduce foundational concepts before advanced ones.
6.  **Pacing:** Distribute the workload reasonably. Avoid overloading any single day.
7.  **Duration:** The schedule must span the entire '{{{scheduleDuration}}}' from the '{{{startDate}}}'.
8.  **Output Format:** Ensure the output is valid JSON matching the 'GenerateLearningScheduleOutputSchema'. The 'schedule' field must be an array of 'DailyTaskSchema' objects.

Example DailyTask object:
{
  "date": "2024-07-01",
  "dayOfWeek": "Monday",
  "topic": "Introduction to Quantum Mechanics - Chapter 1",
  "estimatedDuration": "2 hours",
  "timeSlot": "10:00 AM - 12:00 PM"
}
OR if availability is general:
{
  "date": "2024-07-01",
  "dayOfWeek": "Monday",
  "topic": "Python Basics: Variables and Data Types",
  "estimatedDuration": "1.5 hours",
  "timeSlot": "Flexible"
}

Provide a concise 'summary' of the plan if you wish (e.g., "This 1-year plan focuses on building foundational Python skills then moving to web development...").
Be realistic with the amount of content that can be covered.
`,
});

const generateLearningScheduleFlow = ai.defineFlow(
  {
    name: 'generateLearningScheduleFlow',
    inputSchema: GenerateLearningScheduleInputSchema,
    outputSchema: GenerateLearningScheduleOutputSchema,
  },
  async (input) => {
    const {output} = await generateLearningSchedulePrompt(input);
    return output!;
  }
);
