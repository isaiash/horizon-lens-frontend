# Deployment

Horizon Lens is served at `https://isaiash.com/horizon/` by the **Cloudflare Worker** `horizon-lens` (not Cloudflare Pages).

## Required GitHub secrets (this repo)

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy (same token as `digital-garden-isaias`) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

Optional fallback if the secrets above are missing:

| Secret | Purpose |
|--------|---------|
| `GH_PAT` | Personal access token with `repo` scope to trigger `digital-garden-isaias` workflow `Deploy Horizon Lens Worker` |

## Disable Cloudflare Pages for this repo

If a **Pages** project is connected to `horizon-lens-frontend`, disconnect it in the Cloudflare dashboard. Pages cannot serve `isaiash.com/horizon/` on the main domain; it conflicts with the Worker setup.

Workers & Pages → select the Pages project → Settings → delete or pause Git integration.

## Verify after deploy

```bash
curl -s https://isaiash.com/horizon/ | grep '<title>'
# Expected: Horizon Lens
```
