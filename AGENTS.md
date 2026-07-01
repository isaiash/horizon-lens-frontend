# Horizon Lens Frontend

React SPA for Horizon Lens — a real-time mountain skyline overlay using GPS and device compass.

## Technology Stack

- **Framework:** React 18
- **Build:** Vite 5 + TypeScript
- **Deployment:** Cloudflare Workers at `https://isaiash.com/horizon`
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

## Cloudflare Workers deployment

Push to `main` deploys automatically via GitHub Actions (`.github/workflows/deploy.yml`).

| Setting | Value |
|---------|-------|
| Worker name | `horizon-lens` |
| Route | `isaiash.com/horizon*` |
| Build env | `VITE_API_BASE=https://horizon.ac3eplatforms.com` |
| GitHub secrets | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |

Manual deploy from repo root:

```bash
npm install
npm ci --prefix frontend
VITE_API_BASE=https://horizon.ac3eplatforms.com npm run deploy
```

Production URL: `https://isaiash.com/horizon/`

## Important

- Vite `base` is `/horizon/` — all static assets use this prefix.
- `VITE_API_BASE` must **not** include `/api` (the client appends `/api/skyline`, etc.).
- This repo contains **frontend only**. Backend pipeline is in `horizon-lens-backend`.
- Never commit `.env` or `node_modules/`.
- Do **not** deploy through `digital-garden-isaias`; this repo owns `/horizon` on `isaiash.com`.

## Directory Structure

```text
.
├── frontend/
│   ├── src/
│   │   ├── api/client.ts    # Backend API calls
│   │   ├── render/          # Canvas skyline renderer
│   │   └── sensors/         # GPS + compass
│   ├── public/
│   │   └── _redirects       # Local dev / Pages-style SPA fallback (stripped for Workers deploy)
│   └── config.json          # App tuning (shared with build)
├── scripts/prepare-deploy.mjs # Copies build into dist/horizon/ for Workers subpath routing
├── wrangler.jsonc
├── .github/workflows/deploy.yml
├── .env.example
└── README.md
```
