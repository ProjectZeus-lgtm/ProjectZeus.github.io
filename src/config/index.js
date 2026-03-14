import dotenv from "dotenv";
dotenv.config();

const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o",
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1024", 10),
  },
};

if (!config.openai.apiKey) {
  console.error("Error: OPENAI_API_KEY is not set in .env");
  process.exit(1);
}

export default config;
