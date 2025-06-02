import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {ollama} from '@genkit-ai/ollama'; // Import the Ollama plugin

// To use Genkit with Ollama, ensure your Ollama server is running.
// If Ollama is not running on the default http://localhost:11434,
// set the OLLAMA_BASE_URL environment variable in your .env file.
// Example: OLLAMA_BASE_URL=http://192.168.1.100:11434

export const ai = genkit({
  plugins: [
    googleAI(), // Google AI plugin (requires GOOGLE_API_KEY in .env)
    // ollama(),   // Ollama plugin (connects to local Ollama instance)
    // Add other Genkit plugins here (e.g., for Hugging Face if a specific plugin is available)
  ],
  // The 'model' here sets a default model if none is specified in a flow.
  // To use a specific provider's model, reference it with its prefix in your flows, e.g.:
  // For Google: model: 'googleai/gemini-pro'
  // For Ollama: model: 'ollama/mistral' (or any model you have pulled in Ollama)
  model: 'googleai/gemini-2.0-flash', 
});
