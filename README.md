# project-zeus

CLI tool for querying the OpenAI API.

## Setup

```bash
npm install
```

Add your key to `.env`:

```
OPENAI_API_KEY=sk-...
```

## Usage

```bash
# Ask a question (streams the response)
npx zeus ask "Explain recursion in one paragraph"

# Override model or token limit
npx zeus ask "Hello" --model gpt-4o-mini --max-tokens 256

# Add a system prompt
npx zeus ask "Translate to French: hello world" --system "You are a translator"

# List available models
npx zeus models
```

## Project Structure

```
src/
  cli.js            # Entry point — defines CLI commands via Commander
  config/index.js   # Loads .env and exports configuration
  services/openai.js# OpenAI client wrapper (chat, chatStream)
  commands/
    ask.js          # "ask" command handler
    models.js       # "models" command handler
```
