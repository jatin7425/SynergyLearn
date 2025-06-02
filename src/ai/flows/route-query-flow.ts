
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
  modelName: z.string().describe("The recommended Hugging Face model identifier (e.g., 'deepseek-ai/deepseek-llm-7b-chat')."),
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
  // Use a Google AI model for the routing decision itself.
  model: 'googleai/gemini-2.0-flash', 
  prompt: `You are an AI model routing expert. Analyze the following user query and determine the most suitable Hugging Face AI model to handle it effectively.

User Query: "{{{queryText}}}"

Available Hugging Face models for the main task:
1. 'deepseek-ai/deepseek-llm-7b-chat': Best for general tasks, quick responses, simple summaries, brainstorming. Suitable for less complex queries.
2. 'deepseek-ai/deepseek-llm-67b-chat': Best for complex reasoning, in-depth analysis, creative content generation, tasks requiring higher accuracy, or detailed explanations.

Based on the query's complexity, implied depth, and potential need for creativity or nuanced understanding, choose one Hugging Face model from the list above.
Provide the chosen 'modelName' (exact string from the list) and a brief 'reason' for your selection.

For example:
- If query is "Summarize this short text", choose 'deepseek-ai/deepseek-llm-7b-chat'.
- If query is "Develop a comprehensive marketing strategy for a new tech product", choose 'deepseek-ai/deepseek-llm-67b-chat'.
- If query is "Suggest some learning milestones for 'Advanced Quantum Physics'", choose 'deepseek-ai/deepseek-llm-67b-chat' due to complexity.
- If query is "Suggest some learning milestones for 'Basic Algebra'", choose 'deepseek-ai/deepseek-llm-7b-chat' for simplicity.
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
        console.warn("Model router failed to produce an output. Falling back to default Hugging Face model.");
        return { modelName: 'deepseek-ai/deepseek-llm-7b-chat', reason: "Router failed, using default Hugging Face model (deepseek-7b)." };
    }
    // Ensure the chosen model is one of the allowed Hugging Face ones
    const allowedModels = ['deepseek-ai/deepseek-llm-7b-chat', 'deepseek-ai/deepseek-llm-67b-chat'];
    if (!allowedModels.includes(output.modelName)) {
        console.warn(`Router suggested an unexpected model: ${output.modelName}. Falling back to default Hugging Face model.`);
        return { modelName: 'deepseek-ai/deepseek-llm-7b-chat', reason: `Router suggested invalid model, using default Hugging Face model (deepseek-7b).` };
    }
    return output;
  }
);

