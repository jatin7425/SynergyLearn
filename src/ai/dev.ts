
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/suggest-milestones.ts';
import '@/ai/flows/generate-daily-tasks.ts'; // Renamed from generate-learning-schedule
import '@/ai/flows/generate-weekly-outline.ts'; // Added new flow
