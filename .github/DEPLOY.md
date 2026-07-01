# Deployment

Horizon Lens is served at `https://isaiash.com/horizon/` from the `isaiash-dev` Worker (`dist/horizon/` assets).

## How deploys work

| Event | What runs |
|-------|-----------|
| Push to `horizon-lens-frontend` `main` | `trigger-deploy.yml` → redeploys `isaiash/isaiash-dev` |
| Push to `isaiash-dev` `main` | Builds latest Horizon Lens from this repo and deploys |

## Required GitHub secret (this repo)

| Secret | Purpose |
|--------|---------|
| `GH_PAT` | Fine-grained or classic PAT with `repo` scope on `isaiash/isaiash-dev` |

Create at GitHub → Settings → Developer settings → Personal access tokens.

## Optional: direct Worker deploy

To deploy the standalone `horizon-lens` Worker instead of bundling into `isaiash-dev`, add these secrets and use `.github/workflows/deploy.yml`:

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Same token as `isaiash-dev` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

## Disable Cloudflare Pages

Disconnect the **Pages** project linked to this repo. Pages cannot serve `isaiash.com/horizon/` and conflicts with the Worker setup.

## Verify

```bash
curl -s https://isaiash.com/horizon/ | grep '<title>'
# Expected: Horizon Lens
```
