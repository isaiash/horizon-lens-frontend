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

## Cloudflare Pages deployment

Configure in the Cloudflare Pages dashboard:

| Setting | Value |
|---------|-------|
| **Root directory** | `frontend` |
| **Build command** | `npm ci && npm run build` |
| **Build output directory** | `dist` |
| **Environment variable** | `VITE_API_BASE=https://horizon.ac3eplatforms.com` |

The app is served at `https://isaiash.com/horizon/` (configure custom path routing on your main domain).

### SPA routing

`frontend/public/_redirects` handles client-side routing:

```
/horizon/*  /horizon/index.html  200
```

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
