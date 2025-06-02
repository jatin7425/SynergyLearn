
'use server';
/**
 * @fileOverview An AI flow to select the best model for a given user query.
 *
 * - routeQueryToModel - A function that analyzes a query and suggests an AI model.
 * - UserQueryInput - The input type for the routeQueryToModel function.
 * - ModelDecisionOutput - The return type for the routeQueryToModel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UserQueryInputSchema = z.object({
  queryText: z.string().describe('The user query or task description to be analyzed.'),
  // We could add more context here if needed, like task type, desired output format etc.
});
export type UserQueryInput = z.infer<typeof UserQueryInputSchema>;

const ModelDecisionOutputSchema = z.object({
  modelName: z.string().describe("The recommended model identifier (e.g., 'ollama/llama2', 'ollama/llama3')."),
  reason: z.string().describe('A brief explanation for why this model was chosen.'),
});
export type ModelDecisionOutput = z.infer<typeof ModelDecisionOutputSchema>;

export async function routeQueryToModel(input: UserQueryInput): Promise<ModelDecisionOutput> {
  return routeQueryFlow(input);
}

const routeQueryPrompt = ai.definePrompt({
  name: 'routeQueryPrompt',
  input: {schema: UserQueryInputSchema},
  output: {schema: ModelDecisionOutputSchema},
  // Use an Ollama model for the routing decision itself.
  model: 'ollama/llama2', 
  prompt: `You are an AI model routing expert. Analyze the following user query and determine the most suitable AI model to handle it effectively.

User Query: "{{{queryText}}}"

Available models for the main task (Ollama models):
1. 'ollama/llama2': Best for general tasks, quick responses, simple summaries, brainstorming. Suitable for less complex queries.
2. 'ollama/llama3': Best for complex reasoning, in-depth analysis, creative content generation, tasks requiring higher accuracy, or detailed explanations. (Assumes llama3 is available and generally more capable than llama2 for these tasks).

Based on the query's complexity, implied depth, and potential need for creativity or nuanced understanding, choose one model from the list above.
Provide the chosen 'modelName' and a brief 'reason' for your selection.

For example:
- If query is "Summarize this short text", choose 'ollama/llama2'.
- If query is "Develop a comprehensive marketing strategy for a new tech product", choose 'ollama/llama3'.
- If query is "Suggest some learning milestones for 'Advanced Quantum Physics'", choose 'ollama/llama3' due to complexity.
- If query is "Suggest some learning milestones for 'Basic Algebra'", choose 'ollama/llama2' for simplicity.
`,
});

const routeQueryFlow = ai.defineFlow(
  {
    name: 'routeQueryFlow',
    inputSchema: UserQueryInputSchema,
    outputSchema: ModelDecisionOutputSchema,
  },
  async (input) => {
    const {output} = await routeQueryPrompt(input);
    if (!output) {
        // Fallback or error handling
        console.warn("Model router failed to produce an output. Falling back to default Ollama model.");
        return { modelName: 'ollama/llama2', reason: "Router failed, using default Ollama model." };
    }
    // Ensure the chosen model is one of the allowed Ollama ones
    if (output.modelName !== 'ollama/llama2' && output.modelName !== 'ollama/llama3') {
        console.warn(`Router suggested an unexpected model: ${output.modelName}. Falling back to default Ollama model.`);
        return { modelName: 'ollama/llama2', reason: `Router suggested invalid model, using default Ollama model.` };
    }
    return output;
  }
);

