# Horizon Lens Frontend

React SPA for Horizon Lens — point your phone at the mountains and see a real-time skyline overlay with labeled peaks.

**Production:** [https://isaiash.com/horizon](https://isaiash.com/horizon)

**Backend API:** [https://horizon.ac3eplatforms.com](https://horizon.ac3eplatforms.com)

---

## Local development

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/horizon/`

For API calls, set the backend URL:

```bash
# .env at repo root
VITE_API_BASE=http://localhost:8000
```

Or use the production backend:

```bash
VITE_API_BASE=https://horizon.ac3eplatforms.com npm run dev
```

---

## Build

```bash
cd frontend
VITE_API_BASE=https://horizon.ac3eplatforms.com npm run build
```

Output: `frontend/dist/` with assets under `/horizon/assets/`.

---

## Cloudflare Workers deployment

Push to `main` deploys automatically via GitHub Actions.

| Setting | Value |
|---------|-------|
| **Worker name** | `horizon-lens` |
| **Route** | `isaiash.com/horizon*` |
| **Build command** | `npm ci --prefix frontend && npm run build --prefix frontend` |
| **Environment variable** | `VITE_API_BASE=https://horizon.ac3eplatforms.com` |
| **GitHub secrets** | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |

Manual deploy from repo root:

```bash
npm install
VITE_API_BASE=https://horizon.ac3eplatforms.com npm run deploy
```

The app is served at `https://isaiash.com/horizon/`.

### SPA routing

`frontend/public/_redirects` is used for local dev. The Workers deploy script removes it from the upload bundle and relies on `not_found_handling: single-page-application` in `wrangler.jsonc`.

### HTTPS and sensors

Production HTTPS (Cloudflare) enables GPS and device compass on mobile browsers.

---

## Configuration

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE` | Backend host without `/api` suffix (e.g. `https://horizon.ac3eplatforms.com`) |

App tuning (FOV, colors, cache) is in `frontend/config.json`.

---

## Project structure

```
horizon-lens-frontend/
├── frontend/
│   ├── src/
│   │   ├── api/client.ts       # Backend API client
│   │   ├── render/             # Canvas 2D skyline renderer
│   │   └── sensors/            # GPS + compass hooks
│   ├── public/
│   │   ├── chile-dem.png       # Minimap elevation thumbnail
│   │   └── _redirects          # Cloudflare SPA fallback
│   └── config.json
├── .env.example
└── AGENTS.md
```

Backend pipeline (DEM, preprocessing, horizon index): see `horizon-lens-backend`.

---

## Git checklist

Before first commit:

- [ ] `.env` is not staged
- [ ] `frontend/node_modules/` and `frontend/dist/` are not staged
- [ ] Build succeeds with production `VITE_API_BASE`

See [AGENTS.md](AGENTS.md) for Cursor agent instructions.
