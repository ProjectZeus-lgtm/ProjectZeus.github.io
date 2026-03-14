import OpenAI from "openai";
import config from "../config/index.js";

const client = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Send a single prompt to the chat completions endpoint.
 * @param {string} prompt - The user message.
 * @param {object} [opts] - Optional overrides (model, maxTokens, systemPrompt).
 * @returns {Promise<string>} The assistant's reply text.
 */
export async function chat(prompt, opts = {}) {
  const model = opts.model || config.openai.model;
  const maxTokens = opts.maxTokens || config.openai.maxTokens;
  const messages = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Stream a chat completion, writing tokens to stdout as they arrive.
 * @param {string} prompt - The user message.
 * @param {object} [opts] - Optional overrides.
 */
export async function chatStream(prompt, opts = {}) {
  const model = opts.model || config.openai.model;
  const maxTokens = opts.maxTokens || config.openai.maxTokens;
  const messages = [];

  if (opts.systemPrompt) {
    messages.push({ role: "system", content: opts.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const stream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    process.stdout.write(token);
    full += token;
  }
  process.stdout.write("\n");
  return full;
}
