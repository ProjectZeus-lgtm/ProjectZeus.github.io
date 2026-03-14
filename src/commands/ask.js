import { chatStream } from "../services/openai.js";

/**
 * `ask` command — send a one-shot prompt and stream the reply.
 */
export async function askCommand(prompt, options) {
  if (!prompt) {
    console.error("Usage: zeus ask <prompt>");
    process.exit(1);
  }

  await chatStream(prompt, {
    model: options.model,
    maxTokens: options.maxTokens ? parseInt(options.maxTokens, 10) : undefined,
    systemPrompt: options.system,
  });
}
