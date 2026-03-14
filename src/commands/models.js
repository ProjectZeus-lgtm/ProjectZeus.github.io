import OpenAI from "openai";
import config from "../config/index.js";

/**
 * `models` command — list available models from the API.
 */
export async function modelsCommand() {
  const client = new OpenAI({ apiKey: config.openai.apiKey });
  const list = await client.models.list();

  const models = [];
  for await (const model of list) {
    models.push(model.id);
  }

  models.sort();
  console.log("Available models:\n");
  models.forEach((m) => console.log(`  • ${m}`));
}
