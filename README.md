# Code Debugging Competition Arena

A React/Vite and Express platform for timed code-debugging contests across
Python, C++, and Java. It includes automated evaluation, hints, anti-cheat
monitoring, participant history, reports, an admin console, Redis persistence,
and Telegram notifications.

## Features

- Easy, intermediate, and hard debugging contests
- Python, C++, and Java problem tracks
- Answer evaluation with scoring and hint penalties
- Contest timers and anti-cheat violation logging
- Participant history, leaderboard, and downloadable reports
- Admin console with configuration and diagnostics
- Telegram attendance, security, completion, and diagnostic alerts
- Telegram commands: `/help`, `/status`, `/leaderboard`, and `/recent`

## Local setup

**Requirements:** Node.js 18+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set a strong `ADMIN_SECRET` in `.env.local`. AI, Telegram, and Redis settings
are optional for local development.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `ADMIN_SECRET` | Admin console login secret |
| `GEMINI_API_KEY` | Optional Gemini evaluation and hints |
| `GROQ_API_KEY` | Optional Groq evaluation and hints |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Destination chat for alerts |
| `TELEGRAM_WEBHOOK_URL` | Public site URL for Telegram commands |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `PORT` | Local server port, default `3000` |

Never commit `.env`, `.env.local`, or any API keys.

## Telegram notifications and commands

When a participant starts a contest, the bot receives an attendance alert with
their name, difficulty, language, and timestamp. When the contest report is
generated, the bot receives the score, correct/skipped counts, attempts, hints,
unique score, security flags, and duration.

For bot commands on Vercel, set `TELEGRAM_WEBHOOK_URL` to the deployed public
URL and redeploy. The server registers the webhook and command menu at startup.

## Validation

```bash
npm run lint
npm run build
```

## Deploy to Vercel

Import the repository into Vercel. Use:

- Build command: `npm run build`
- Output directory: `dist`

Add the required environment variables in Vercel Project Settings. Configure
both Upstash Redis variables for durable participant history, sessions, and
reports across serverless instances. Without Redis, Vercel storage is
ephemeral.
