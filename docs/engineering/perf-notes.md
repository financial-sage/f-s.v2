# Performance notes

## App vs database

With small datasets, screen-transition latency is dominated by **repeated Auth RTTs** and **sequential server waterfalls**, not Postgres query time.

Instrumentation: set `PERF_LOG=1` (server) and/or `NEXT_PUBLIC_PERF_LOG=1` (client) to log `[perf]` timings for `getRequestUser`, page bootstraps, `getHomePageData`, and key actions.

## Region check (manual)

Compare:

1. **Vercel** project → Settings → Regions (or Functions region)
2. **Supabase** project `ovpeumhwyfrfbbrspsrs` → Project Settings → General → Region

If they differ (e.g. Vercel `iad1` vs Supabase `eu-west`), every `auth.getUser()` and query pays extra RTT. Align regions when possible.

## Hot-path mitigations in code

- `src/lib/request-context.ts` — `React.cache` for user + family_id per request
- Accounts overview loaded in RSC (no duplicate mount action)
- Fund “favorito” uses `setDefaultFundAction` without expense `refreshData`
- Fund meta mutations skip `revalidatePath("/")` (dashboard uses Zustand)
