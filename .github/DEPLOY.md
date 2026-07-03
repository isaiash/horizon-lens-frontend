# Deployment

Horizon Lens is served at `https://isaiash.com/horizon/` from the standalone `horizon-lens` Cloudflare Worker (assets under `dist/horizon/`).

The portfolio site at `https://isaiash.com/` is deployed separately from `isaiash/isaiash-dev` (`digital-garden-isaias`).

## How deploys work

| Event | What runs |
|-------|-----------|
| Push to `horizon-lens-frontend` `main` | `.github/workflows/deploy.yml` → deploys `horizon-lens` Worker |
| Push to `isaiash-dev` `main` | Deploys `isaiash-dev` Worker (root site only) |

## Required GitHub secrets (this repo)

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers deploy permissions (same account as `isaiash-dev`) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

## Local deploy

Authenticate once:

```bash
npx wrangler login
```

Then from repo root:

```bash
npm ci
npm ci --prefix frontend
VITE_API_BASE=https://horizon.ac3eplatforms.com npm run deploy
```

## Disable Cloudflare Pages

Disconnect any **Pages** project linked to this repo. Pages cannot serve `isaiash.com/horizon/` and conflicts with the Worker setup.

## Verify

```bash
curl -sI https://isaiash.com/horizon | grep -i location   # 301 → /horizon/
curl -s https://isaiash.com/horizon/ | grep '<title>'    # Horizon Lens
curl -s https://isaiash.com/ | grep '<title>'            # portfolio site
```
