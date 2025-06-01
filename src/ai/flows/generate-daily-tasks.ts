
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
  periodDurationDays: z.number().int().min(1).max(31).default(7).describe('The duration of this planning period in days (e.g., 7 for a week).'),
  workingDayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").describe('User\'s study start time on working days (HH:MM format).'),
  workingDayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").describe('User\'s study end time on working days (HH:MM format).'),
  weeklyHolidays: z.array(z.string()).optional().describe('Days of the week the user takes off (full day names, e.g., ["Saturday", "Sunday"]).'),
  holidayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").optional().describe('User\'s study start time on selected holiday days (HH:MM format). Only if holidays are selected and user wants to study.'),
  holidayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").optional().describe('User\'s study end time on selected holiday days (HH:MM format). Only if holidays are selected and user wants to study.'),
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
Your task is to generate a structured daily learning plan for the '{{{periodGoal}}}', covering {{{periodDurationDays}}} days, starting from {{{periodStartDate}}}.

User's Availability Details for this Period:
- Working Day Availability: From {{{workingDayStartTime}}} to {{{workingDayEndTime}}}
{{#if weeklyHolidays.length}}
- Weekly Holidays (contextual, these days are off or have different availability): {{#each weeklyHolidays}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{#if holidayStartTime}}
  - Availability on these Holiday Days (if they fall in this period): From {{{holidayStartTime}}} to {{{holidayEndTime}}}
  {{else}}
  - These holidays are generally for rest unless 'Utilize Holidays' is true and you deem it necessary for the goal.
  {{/if}}
{{else}}
- Weekly Holidays: None specified by user. Assume all days in the period follow working day availability.
{{/if}}
- Utilize Holidays for Learning if Needed: {{{utilizeHolidays}}} (If true, you can schedule tasks on selected holidays if they fall within this {{{periodDurationDays}}}-day period, especially if holiday availability is provided or if crucial for the '{{{periodGoal}}}'. If false and no holiday availability, holidays are rest days.)

Instructions:
1.  **Understand the Period Goal:** Focus on breaking down the '{{{periodGoal}}}' into manageable daily learning tasks that can be realistically achieved within the {{{periodDurationDays}}} days.
2.  **Respect Availability for Each Day:** For each of the {{{periodDurationDays}}} days starting from '{{{periodStartDate}}}':
    - Determine if the day is a working day or a holiday based on 'weeklyHolidays'.
    - For working days, allocate study time between '{{{workingDayStartTime}}}' and '{{{workingDayEndTime}}}'.
    - For days that are designated holidays:
        - If '{{{holidayStartTime}}}' and '{{{holidayEndTime}}}' are provided, use this specific availability.
        - If holiday times are NOT provided, and '{{{utilizeHolidays}}}' is true, you MAY schedule study tasks, assuming a reasonable duration.
        - If holiday times are NOT provided, and '{{{utilizeHolidays}}}' is false, these days should primarily be "Rest Day" or "Catch-up/Review Day".
3.  **Time Slots & Duration:** For each task, provide a 'timeSlot' (e.g., "09:00 - 11:00") and an 'estimatedDuration' (e.g., "2 hours"). These should be derived from the availability for that specific day of the week.
4.  **Structure Output:**
    - The main output should be an array of 'DailyTask' objects in the 'tasks' field.
    - Each DailyTask object must include:
        - 'date': The specific date for the task (YYYY-MM-DD format). Calculate this for each of the {{{periodDurationDays}}} days, starting from '{{{periodStartDate}}}'.
        - 'dayOfWeek': The corresponding day of the week (e.g., Monday, Tuesday).
        - 'topic': The specific topic or sub-task to study to achieve the '{{{periodGoal}}}'. Make this actionable. Include "Review previous topics from this week" or "Buffer/Catch-up" if appropriate. Some days might be "Rest Day".
        - 'estimatedDuration': e.g., "1 hour", "2.5 hours".
        - 'timeSlot': e.g., "10:00 - 12:00".
5.  **Topic Progression:** Ensure topics flow logically within the {{{periodDurationDays}}}-day period to fulfill the '{{{periodGoal}}}'.
6.  **Pacing:** Distribute the workload reasonably across the {{{periodDurationDays}}} days. Avoid overloading any single day.
7.  **Output Format:** Ensure the output is valid JSON matching the 'GenerateDailyTasksOutputSchema'. The 'tasks' field must be an array of 'DailyTaskSchema' objects.
8.  **Granularity:** The output MUST be a day-by-day schedule for the ENTIRE '{{{periodDurationDays}}}' days. Do not summarize.

Example DailyTask object:
{
  "date": "2024-07-01",
  "dayOfWeek": "Monday",
  "topic": "Module 1 of '{{{periodGoal}}}': Core Concepts",
  "estimatedDuration": "2 hours",
  "timeSlot": "10:00 - 12:00"
}

Provide a concise 'summary' of the daily plan for this period if you wish.
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
