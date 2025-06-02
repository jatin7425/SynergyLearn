
import { config } from 'dotenv';
config();

// Ensure all your flow files are imported here so Genkit can discover them.
import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/suggest-milestones.ts';
import '@/ai/flows/generate-daily-tasks.ts'; 
import '@/ai/flows/generate-weekly-outline.ts'; 
import '@/ai/flows/chat-assistant-flow.ts'; 
import '@/ai/flows/summarize-chat-flow.ts'; 
import '@/ai/flows/support-bot-flow.ts';
import '@/ai/flows/route-query-flow.ts'; // Added import for the new router flow

// Import any model providers you want to use in development.
// This allows Genkit's dev tools (like the inspector) to recognize these models.
import {googleAI} from '@genkit-ai/googleai';
// import {ollama} from '@genkit-ai/ollama'; // Ollama import commented out due to install issues

// You don't typically need to explicitly call the plugins here if they are configured in src/ai/genkit.ts
// and that 'ai' instance is used globally. Genkit's start command will pick them up.
// However, explicitly listing them ensures they are part of the dev server's context if needed for specific dev-time model registration or checks.

// Example: If you were defining models directly in dev.ts (not common if genkit.ts is set up):
// import {defineModel} from 'genkit/models';
// defineModel(
//   {
//     name: 'ollama/my-custom-model',
//     label: 'Ollama - My Custom Model',
//     types: ['generate'],
//     configured: true,
//   },
//   async (request) => { /* ... your custom Ollama call logic ... */ }
// );
