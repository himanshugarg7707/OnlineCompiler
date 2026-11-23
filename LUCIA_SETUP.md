# Lucia Gemini setup

Lucia uses Gemini 3.8 Flash.

## Per-browser key

In Settings → AI & Diagnostics, select Gemini and enter a Gemini API key. This key is stored only in that browser's local settings, so it does not automatically appear on another computer.

## Shared backend key for multiple devices

Set `GEMINI_API_KEY` in the backend deployment's environment variables, then redeploy/restart the backend. On each device, select Gemini in Settings → AI & Diagnostics and leave the personal key field empty. Requests will use the backend key through `/api/ai/generate`.

### Vercel

The existing `vercel.json` rewrite sends `/api/*` requests to `api/index.js`, which mounts the Express routes including Lucia's `/api/ai/generate` endpoint. In Vercel, open **Project → Settings → Environment Variables**, add `GEMINI_API_KEY` as a **Secret** for Production (and Preview/Development if those deployments need Lucia), then redeploy. Optionally set `GEMINI_MODEL`; it defaults to `gemini-3.8-flash`.

The backend proxy limits each client IP to 30 requests per minute. Keep the key in the backend environment; do not add it to frontend environment variables or commit it to source control.

To choose another model explicitly, set `GEMINI_MODEL` on the backend. The default is `gemini-3.8-flash`.
