# PromptPilot AI

PromptPilot AI is a browser-only Angular POC for reviewing AI coding prompts against a ticket, supplied technical context, developer constraints, and known regression risks. It uses Gemini to return a structured analysis and a complete, copyable optimized prompt.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Configure Gemini

1. Create a Gemini API key in Google AI Studio.
2. Start the app and open **Settings**.
3. Paste the key into **Session-only key** and select **Use for this session**.
4. Use **Test connection** before running an analysis.

The session field clears after use and its key is held in memory only. It is not written to localStorage, prompt history, downloads, or logs. A developer-only placeholder is also available in `src/environments/environment.ts` as `gemini.apiKey`; never commit a real key.

The selected model is configured in the same environment file (`gemini.model`) and currently defaults to `gemini-3.8-flash`.

## Important security limitation

This project is a local/internal frontend POC. Any API key embedded in a deployed browser application can be discovered by its users. Do **not** use a client-side key for a public production deployment; move Gemini access to a protected backend and enforce authentication, authorization, quotas, and auditing there.

## Features

- Reactive-form analysis workspace with validation and example context
- Real Gemini structured JSON analysis with malformed-response and API error handling
- Optimized, editable coding-agent prompt, copy/download/export controls, and reevaluation score comparison
- Browser-local saved history with search, filter, sort, open, duplicate, rename, and delete
- Dashboard statistics calculated from saved browser data
- Session-only key settings and connection test

## Validation

Run `npm run build` to compile the production build. The application uses the official `@google/genai` SDK and `lucide-angular` icons.
