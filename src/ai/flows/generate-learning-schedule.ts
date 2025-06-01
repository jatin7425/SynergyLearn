
'use server';
/**
 * @fileOverview Generates a detailed daily learning tasks for a specific period (e.g., a week).
 *
 * - generateDailyTasks - A function that creates daily tasks.
 * - GenerateDailyTasksInput - The input type for the generateDailyTasks function.
 * - GenerateDailyTasksOutput - The return type for the generateDailyTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDailyTasksInputSchema = z.object({
  periodGoal: z.string().describe('The specific learning goal or topic for this period (e.g., for this week).'),
  periodStartDate: z.string().describe('The start date for this period in YYYY-MM-DD format.'),
  periodDurationDays: z.number().int().min(1).max(31).describe('The duration of this planning period in days (e.g., 7 for a week).'),
  workingDayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Working day start time must be in HH:MM format").describe('User\'s study start time on working days (HH:MM format).'),
  workingDayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Working day end time must be in HH:MM format").describe('User\'s study end time on working days (HH:MM format).'),
  weeklyHolidays: z.array(z.string()).optional().describe('Days of the week the user takes off. Example: ["Saturday", "Sunday"].'),
  holidayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Holiday start time must be in HH:MM format").optional().describe('User\'s study start time on selected holiday days (HH:MM format). Only if holidays are selected and user wants to study.'),
  holidayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Holiday end time must be in HH:MM format").optional().describe('User\'s study end time on selected holiday days (HH:MM format). Only if holidays are selected and user wants to study.'),
  utilizeHolidays: z.boolean().describe('Whether the user wants to utilize their weekly holidays for learning if needed, or if holiday study times are provided.'),
});
export type GenerateDailyTasksInput = z.infer<typeof GenerateDailyTasksInputSchema>;

const DailyTaskSchema = z.object({
  date: z.string().describe('The date for this task in YYYY-MM-DD format.'),
  dayOfWeek: z.string().describe('The day of the week (e.g., Monday, Tuesday).'),
  topic: z.string().describe('The specific topic or subject to study for the day. Could be "Review previous topics" or "Rest Day" if applicable.'),
  estimatedDuration: z.string().optional().describe('Estimated time to spend on this topic (e.g., "2 hours", "1.5 hours").'),
  timeSlot: z.string().optional().describe('Suggested time slot (e.g., "9 AM - 11 AM" or "14:00 - 16:30").'),
});
export type DailyTask = z.infer<typeof DailyTaskSchema>;

const GenerateDailyTasksOutputSchema = z.object({
  tasks: z.array(DailyTaskSchema).describe('An array of daily learning tasks for the specified period, structured chronologically.'),
  summary: z.string().optional().describe('A brief summary or overview of the generated daily tasks for this period.'),
});
export type GenerateDailyTasksOutput = z.infer<typeof GenerateDailyTasksOutputSchema>;

export async function generateDailyTasks(input: GenerateDailyTasksInput): Promise<GenerateDailyTasksOutput> {
  return generateDailyTasksFlow(input);
}

const generateDailyTasksPrompt = ai.definePrompt({
  name: 'generateDailyTasksPrompt',
  input: {schema: GenerateDailyTasksInputSchema},
  output: {schema: GenerateDailyTasksOutputSchema},
  prompt: `You are an AI expert in creating detailed daily learning schedules for a specific period.
Your task is to generate a structured daily learning plan based on the user's inputs for a period of {{{periodDurationDays}}} days, starting from {{{periodStartDate}}}.

User Inputs for this Period:
- Period Goal/Topic: {{{periodGoal}}}
- Period Start Date: {{{periodStartDate}}}
- Period Duration: {{{periodDurationDays}}} days
- Working Day Availability: From {{{workingDayStartTime}}} to {{{workingDayEndTime}}}
{{#if weeklyHolidays.length}}
- Weekly Holidays (within the broader context, apply to days of this period): {{#each weeklyHolidays}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{#if holidayStartTime}}
  - Availability on these Holidays: From {{{holidayStartTime}}} to {{{holidayEndTime}}}
  {{else}}
  - These holidays are for rest unless 'Utilize Holidays' is true and AI deems it necessary.
  {{/if}}
{{else}}
- Weekly Holidays: None specified (assume 7 days study based on working day availability for this period).
{{/if}}
- Utilize Holidays for Learning: {{{utilizeHolidays}}} (If true, AI can schedule tasks on selected holidays, especially if holiday availability is provided or if needed. If false and no holiday availability, holidays are rest days.)

Instructions:
1.  **Understand the Period Goal:** Break down the '{{{periodGoal}}}' into manageable daily tasks distributed over the {{{periodDurationDays}}} days.
2.  **Respect Availability for Each Day in the Period:**
    - For working days (days not in 'weeklyHolidays' list that fall within this period), allocate study time between '{{{workingDayStartTime}}}' and '{{{workingDayEndTime}}}'.
    - For days listed in 'weeklyHolidays' that fall within this period:
        - If '{{{holidayStartTime}}}' and '{{{holidayEndTime}}}' are provided, use this specific availability.
        - If holiday times are NOT provided, and '{{{utilizeHolidays}}}' is true, you MAY schedule study tasks, assuming a reasonable duration.
        - If holiday times are NOT provided, and '{{{utilizeHolidays}}}' is false, these days should primarily be "Rest Day" or "Catch-up Day".
3.  **Time Slots & Duration:** For each task, provide a 'timeSlot' (e.g., "09:00 - 11:00") and an 'estimatedDuration' (e.g., "2 hours"). These should be derived from the availability for that specific day.
4.  **Structure Output:**
    - Return an array of 'DailyTask' objects in the 'tasks' field. Each object must include:
        - 'date': The specific date for the task (YYYY-MM-DD format), starting from '{{{periodStartDate}}}' and covering {{{periodDurationDays}}} days.
        - 'dayOfWeek': The corresponding day of the week.
        - 'topic': The specific topic to study. Make this actionable. Include "Review" sessions if appropriate for the period goal. Some days might be "Rest Day".
        - 'estimatedDuration'.
        - 'timeSlot'.
5.  **Topic Progression:** Ensure topics flow logically within the period to achieve the '{{{periodGoal}}}'.
6.  **Pacing:** Distribute the workload reasonably. Avoid overloading any single day.
7.  **Output Format:** Ensure the output is valid JSON matching the 'GenerateDailyTasksOutputSchema'.
8.  **Granularity:** The output MUST be a day-by-day schedule for the specified '{{{periodDurationDays}}}' days.

Example DailyTask object:
{
  "date": "2024-07-01",
  "dayOfWeek": "Monday",
  "topic": "Introduction to {{{periodGoal}}} - Module 1",
  "estimatedDuration": "2 hours",
  "timeSlot": "10:00 - 12:00"
}

Provide a concise 'summary' of the plan for this period if you wish.
`,
});

const generateDailyTasksFlow = ai.defineFlow(
  {
    name: 'generateDailyTasksFlow',
    inputSchema: GenerateDailyTasksInputSchema,
    outputSchema: GenerateDailyTasksOutputSchema,
  },
  async (input) => {
    const {output} = await generateDailyTasksPrompt(input);
    return output!;
  }
);
// Ensure the old file name is preserved in case of direct access or other references
// This is effectively renaming generate-learning-schedule.ts to generate-daily-tasks.ts
// by changing the content and then the file name will be reflected in the file system.
// For the purpose of this operation, this file's content is now for generate-daily-tasks.
// The old generate-learning-schedule.ts will be deleted if it's a rename, or this is its new content.
// To be safe, I'm assuming this file is now src/ai/flows/generate-daily-tasks.ts
