
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
  workingDayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Working day start time must be in HH:MM format").describe('User\'s study start time on working days (HH:MM format).'),
  workingDayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Working day end time must be in HH:MM format").describe('User\'s study end time on working days (HH:MM format).'),
  weeklyHolidays: z.array(z.string()).optional().describe('Days of the week the user takes off. Example: ["Saturday", "Sunday"].'),
  holidayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Holiday start time must be in HH:MM format").optional().describe('User\'s study start time on selected holiday days (HH:MM format). Only if holidays are selected and user wants to study.'),
  holidayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Holiday end time must be in HH:MM format").optional().describe('User\'s study end time on selected holiday days (HH:MM format). Only if holidays are selected and user wants to study.'),
  utilizeHolidays: z.boolean().describe('Whether the user wants to utilize their weekly holidays for learning if needed to meet the goal within the duration, or if holiday study times are provided.'),
  startDate: z.string().describe('The start date for the schedule in YYYY-MM-DD format. This is for the AI to calculate dates correctly.'),
});
export type GenerateLearningScheduleInput = z.infer<typeof GenerateLearningScheduleInputSchema>;

const DailyTaskSchema = z.object({
  date: z.string().describe('The date for this task in YYYY-MM-DD format.'),
  dayOfWeek: z.string().describe('The day of the week (e.g., Monday, Tuesday).'),
  topic: z.string().describe('The specific topic or subject to study for the day. Could be "Review previous topics" or "Rest Day" if applicable.'),
  estimatedDuration: z.string().optional().describe('Estimated time to spend on this topic (e.g., "2 hours", "1.5 hours").'),
  timeSlot: z.string().optional().describe('Suggested time slot (e.g., "9 AM - 11 AM" or "14:00 - 16:30").'),
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
- Working Day Availability: From {{{workingDayStartTime}}} to {{{workingDayEndTime}}}
{{#if weeklyHolidays.length}}
- Weekly Holidays: {{#each weeklyHolidays}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{#if holidayStartTime}}
  - Availability on these Holidays: From {{{holidayStartTime}}} to {{{holidayEndTime}}}
  {{else}}
  - These holidays are for rest unless 'Utilize Holidays' is true and AI deems it necessary.
  {{/if}}
{{else}}
- Weekly Holidays: None specified (assume 7 days study based on working day availability).
{{/if}}
- Utilize Holidays for Learning: {{{utilizeHolidays}}} (If true, AI can schedule tasks on selected holidays, especially if holiday availability is provided or if needed to meet ambitious goals. If false and no holiday availability, holidays are rest days.)
- Schedule Start Date: {{{startDate}}}

Instructions:
1.  **Understand the Goal:** Break down the '{{{learningGoal}}}' into logical sub-topics or modules that can be distributed over the '{{{scheduleDuration}}}'.
2.  **Respect Availability:**
    - For working days (days not in 'weeklyHolidays' list), allocate study time between '{{{workingDayStartTime}}}' and '{{{workingDayEndTime}}}'.
    - For days listed in 'weeklyHolidays':
        - If '{{{holidayStartTime}}}' and '{{{holidayEndTime}}}' are provided, use this specific availability for those days.
        - If holiday times are NOT provided, and '{{{utilizeHolidays}}}' is true, you MAY schedule study tasks on these days if essential for the goal, assuming a reasonable duration comparable to working days or slightly less.
        - If holiday times are NOT provided, and '{{{utilizeHolidays}}}' is false, these days should primarily be "Rest Day" or "Catch-up Day".
3.  **Time Slots:** For each task, provide a 'timeSlot' (e.g., "09:00 - 11:00", "14:30 - 16:00"). This should be derived from the specified availability for that day.
4.  **Estimated Duration:** Also provide an 'estimatedDuration' (e.g., "2 hours", "1.5 hours") for each task.
5.  **Structure Output:**
    - Return an array of 'DailyTask' objects. Each object must include:
        - 'date': The specific date for the task (YYYY-MM-DD format), starting from '{{{startDate}}}'.
        - 'dayOfWeek': The corresponding day of the week.
        - 'topic': The specific topic to study. Make this actionable. Include "Review" sessions periodically. Some days might be "Rest Day" or "Buffer/Catch-up".
        - 'estimatedDuration': e.g., "1 hour", "2.5 hours".
        - 'timeSlot': e.g., "10:00 - 12:00".
6.  **Topic Progression:** Ensure topics flow logically. Introduce foundational concepts before advanced ones.
7.  **Pacing:** Distribute the workload reasonably. Avoid overloading any single day.
8.  **Duration:** The schedule must span the entire '{{{scheduleDuration}}}' from the '{{{startDate}}}'.
9.  **Output Format:** Ensure the output is valid JSON matching the 'GenerateLearningScheduleOutputSchema'. The 'schedule' field must be an array of 'DailyTaskSchema' objects.
10. **Granularity:** For ALL selected durations (1 month, 1 year, 2 years), the output MUST be a day-by-day schedule. Provide a 'DailyTask' object for each individual day within the entire schedule duration. Do NOT summarize into weekly or monthly tasks for longer durations.

Example DailyTask object:
{
  "date": "2024-07-01",
  "dayOfWeek": "Monday",
  "topic": "Introduction to Quantum Mechanics - Chapter 1",
  "estimatedDuration": "2 hours",
  "timeSlot": "10:00 - 12:00"
}

Provide a concise 'summary' of the plan if you wish.
Be realistic with the amount of content that can be covered. For very long durations like 1 or 2 years, ensure topics are appropriately high-level for daily tasks but still provide a clear focus for each day.
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

