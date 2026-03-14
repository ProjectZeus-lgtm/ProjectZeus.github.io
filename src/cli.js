#!/usr/bin/env node

import { Command } from "commander";
import { askCommand } from "./commands/ask.js";
import { modelsCommand } from "./commands/models.js";

const program = new Command();

program
  .name("zeus")
  .description("CLI tool for querying the OpenAI API")
  .version("1.0.0");

program
  .command("ask <prompt>")
  .description("Send a prompt and stream the response")
  .option("-m, --model <model>", "Override the model (default: gpt-4o)")
  .option("-t, --max-tokens <n>", "Max tokens in the response")
  .option("-s, --system <prompt>", "System prompt to prepend")
  .action(askCommand);

program
  .command("models")
  .description("List available OpenAI models")
  .action(modelsCommand);

program.parse();
