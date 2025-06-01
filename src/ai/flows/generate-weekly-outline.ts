
'use server';
/**
 * @fileOverview Generates a weekly learning outline (goals/topics) for a given overall learning goal and duration.
 *
 * - generateWeeklyOutline - A function that creates a weekly learning outline.
 * - GenerateWeeklyOutlineInput - The input type for the generateWeeklyOutline function.
 * - GenerateWeeklyOutlineOutput - The return type for the generateWeeklyOutline function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { addDays, format, parseISO, getDay } from 'date-fns';


const GenerateWeeklyOutlineInputSchema = z.object({
  overallLearningGoal: z.string().describe('The primary learning goal of the user for the entire duration.'),
  scheduleDuration: z.enum(['1 month', '1 year', '2 years']).describe('The desired total duration for the learning schedule.'),
  workingDayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").describe('User\'s study start time on working days (HH:MM format).'),
  workingDayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").describe('User\'s study end time on working days (HH:MM format).'),
  weeklyHolidays: z.array(z.string()).optional().describe('Days of the week the user takes off (full day names, e.g., ["Saturday", "Sunday"]).'),
  holidayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").optional().describe('User\'s study start time on selected holiday days (HH:MM format).'),
  holidayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format").optional().describe('User\'s study end time on selected holiday days (HH:MM format).'),
  utilizeHolidays: z.boolean().describe('Whether the user wants to utilize their weekly holidays for learning if needed.'),
  startDateForOutline: z.string().describe('The start date for the entire schedule outline in YYYY-MM-DD format. Weeks will be calculated from this date.'),
});
export type GenerateWeeklyOutlineInput = z.infer<typeof GenerateWeeklyOutlineInputSchema>;

const WeeklyGoalItemSchema = z.object({
  weekNumber: z.number().int().min(1).describe('The sequential number of the week in the schedule.'),
  startDate: z.string().describe('The start date of this week in YYYY-MM-DD format.'),
  endDate: z.string().describe('The end date of this week in YYYY-MM-DD format.'),
  goalOrTopic: z.string().describe('The primary learning goal or topic for this specific week.'),
});
export type WeeklyGoalItem = z.infer<typeof WeeklyGoalItemSchema>;

const GenerateWeeklyOutlineOutputSchema = z.object({
  weeklyOutline: z.array(WeeklyGoalItemSchema).describe('An array of weekly learning goals/topics, structured chronologically.'),
  summary: z.string().optional().describe('A brief summary or overview of the generated weekly outline.'),
});
export type GenerateWeeklyOutlineOutput = z.infer<typeof GenerateWeeklyOutlineOutputSchema>;

export async function generateWeeklyOutline(input: GenerateWeeklyOutlineInput): Promise<GenerateWeeklyOutlineOutput> {
  // Pre-calculate week start/end dates to provide to AI as context
  const totalWeeks = input.scheduleDuration === '1 month' ? 4 : (input.scheduleDuration === '1 year' ? 52 : 104);
  const weekDateRanges: { weekNumber: number, startDate: string, endDate: string }[] = [];
  let currentStartDate = parseISO(input.startDateForOutline);

  for (let i = 0; i < totalWeeks; i++) {
    const weekStartDate = format(currentStartDate, 'yyyy-MM-dd');
    const weekEndDate = format(addDays(currentStartDate, 6), 'yyyy-MM-dd');
    weekDateRanges.push({
      weekNumber: i + 1,
      startDate: weekStartDate,
      endDate: weekEndDate,
    });
    currentStartDate = addDays(currentStartDate, 7);
  }
  
  const { output } = await generateWeeklyOutlinePrompt({ ...input, weekDateRanges });
  return output!;
}

const generateWeeklyOutlinePrompt = ai.definePrompt({
  name: 'generateWeeklyOutlinePrompt',
  input: { schema: GenerateWeeklyOutlineInputSchema.extend({
    weekDateRanges: z.array(z.object({
      weekNumber: z.number(),
      startDate: z.string(),
      endDate: z.string()
    })).describe("Pre-calculated start and end dates for each week of the schedule duration.")
  })},
  output: { schema: GenerateWeeklyOutlineOutputSchema },
  prompt: `You are an AI expert in creating high-level weekly learning outlines.
Your task is to break down an overall learning goal into manageable weekly goals or topics over a specified duration.

Overall Learning Goal: {{{overallLearningGoal}}}
Total Schedule Duration: {{{scheduleDuration}}}
Start Date for Entire Outline: {{{startDateForOutline}}}

User's General Availability (for pacing considerations):
- Working Day Availability: From {{{workingDayStartTime}}} to {{{workingDayEndTime}}}
{{#if weeklyHolidays.length}}
- Weekly Holidays: {{#each weeklyHolidays}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{#if holidayStartTime}}
  - Availability on these Holidays: From {{{holidayStartTime}}} to {{{holidayEndTime}}}
  {{else}}
  - Generally, these holidays are for rest unless 'Utilize Holidays' is true.
  {{/if}}
{{else}}
- Weekly Holidays: None specified (assume study on all days based on working day availability).
{{/if}}
- Utilize Holidays for Learning: {{{utilizeHolidays}}}

Pre-calculated Week Information (Use these exact week numbers, start dates, and end dates):
{{#each weekDateRanges}}
- Week {{weekNumber}}: Starts {{startDate}}, Ends {{endDate}}
{{/each}}

Instructions:
1.  **Deconstruct Goal:** Break the '{{{overallLearningGoal}}}' into logical weekly sub-goals or topics.
2.  **Assign to Weeks:** Assign one primary goal/topic to each week from the 'weekDateRanges' provided. Ensure the 'weekNumber', 'startDate', and 'endDate' in your output for each item match exactly with the pre-calculated 'weekDateRanges'.
3.  **Pacing:** Consider the user's general availability to ensure the scope of each weekly goal/topic is realistic. For example, if a user has many holidays or limited daily hours, the weekly topics should be less dense.
4.  **Logical Flow:** Ensure the weekly topics progress logically from foundational to more advanced.
5.  **Coverage:** The weekly outline must cover the entire '{{{scheduleDuration}}}'. The number of items in your 'weeklyOutline' array must match the number of weeks in 'weekDateRanges'.
6.  **Output Format:**
    - Return an array named 'weeklyOutline'.
    - Each item in 'weeklyOutline' must be an object with 'weekNumber' (integer), 'startDate' (YYYY-MM-DD), 'endDate' (YYYY-MM-DD), and 'goalOrTopic' (string).
    - The 'goalOrTopic' should be a concise description of the learning focus for that week.
    - Ensure the output is valid JSON matching the 'GenerateWeeklyOutlineOutputSchema'.

Example output item for 'weeklyOutline':
{
  "weekNumber": 1,
  "startDate": "2024-07-01",
  "endDate": "2024-07-07",
  "goalOrTopic": "Introduction to {{{overallLearningGoal}}} - Core Concepts"
}

Provide a concise 'summary' of the overall weekly plan if you wish.
`,
});
