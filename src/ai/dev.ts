
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/suggest-milestones.ts';
import '@/ai/flows/generate-learning-schedule.ts'; // Added new flow
