# Horizon Lens Frontend

React SPA for Horizon Lens — a real-time mountain skyline overlay using GPS and device compass.

## Technology Stack

- **Framework:** React 18
- **Build:** Vite 5 + TypeScript
- **Deployment:** Cloudflare Pages at `https://isaiash.com/horizon`
- **Backend API:** `https://horizon.ac3eplatforms.com` (configured via `VITE_API_BASE`)

## Setup

```bash
cd frontend
npm install
cp ../.env.example ../.env   # optional for local dev
npm run dev
```

Local dev URL: `http://localhost:5173/horizon/`

## Build

```bash
cd frontend
VITE_API_BASE=https://horizon.ac3eplatforms.com npm run build
```

Output: `frontend/dist/`

## Cloudflare Pages

| Setting | Value |
|---------|-------|
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_API_BASE=https://horizon.ac3eplatforms.com` |

Production URL: `https://isaiash.com/horizon/`

## Important

- Vite `base` is `/horizon/` — all static assets use this prefix.
- `VITE_API_BASE` must **not** include `/api` (the client appends `/api/skyline`, etc.).
- This repo contains **frontend only**. Backend pipeline is in `horizon-lens-backend`.
- Never commit `.env` or `node_modules/`.

## Directory Structure

```text
.
├── frontend/
│   ├── src/
│   │   ├── api/client.ts    # Backend API calls
│   │   ├── render/          # Canvas skyline renderer
│   │   └── sensors/         # GPS + compass
│   ├── public/
│   │   └── _redirects       # SPA fallback for Cloudflare Pages
│   └── config.json          # App tuning (shared with build)
├── .env.example
└── README.md
```
