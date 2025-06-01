
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/suggest-milestones.ts';
import '@/ai/flows/generate-daily-tasks.ts'; // Renamed from generate-learning-schedule
import '@/ai/flows/generate-weekly-outline.ts'; // Added new flow
import '@/ai/flows/chat-assistant-flow.ts'; // Added new AI chat assistant flow
import '@/ai/flows/summarize-chat-flow.ts'; // Added new chat summarization flow
