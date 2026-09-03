# Vault

Private academic notes, files, and lecture videos. Static Astro UI on Cloudflare Workers, with a thin `/api` Worker talking to D1 (notes) and R2 (files).

## Local

```bash
npm install
npm run db:migrate
npm run dev
```

- UI: http://localhost:4321 (proxies `/api` to the Worker)
- Worker: http://localhost:8787

`npm run preview` serves the production build through Wrangler on one port.

## Deploy

```bash
npm run deploy
```

Then lock the Worker hostname behind **Cloudflare Access** (Zero Trust → Applications) so only your account can reach it.

## Bindings

| Binding | Resource |
| --- | --- |
| `DB` | D1 `private-d1` |
| `BUCKET` | R2 `private-storage` |

Lecture videos over ~95 MB cannot go through a single Worker request on the free plan. Compress or split them first.
