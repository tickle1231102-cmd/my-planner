# AGENTS.md

## Cursor Cloud specific instructions

### Product overview
This repo is a single product: **Focal** (package name `my-planner`), a Korean-language personal-planner PWA. It is a Vite + React 19 SPA. There is **no separate backend process** in dev — the `/api/*` endpoints run inside the Vite dev server via `cloudApiDevPlugin()` (`vite.cloudApi.js`, wired in `vite.config.js`), delegating to `server/*`. In production these same handlers run as Vercel functions.

### Running / building / testing
Standard scripts in `package.json`: `npm run dev` (Vite dev server + in-process API on `http://localhost:5173`), `npm run build`, `npm run preview`, `npm run lint` (oxlint). There is no automated test suite. `npm run lint` only emits warnings (no error-level rules); a clean run exits 0 with warnings.

### Local-first: no cloud credentials needed to run/test the app
The app is **local-first** (all planner/habit/mandala/memory data persists to `localStorage`). Supabase powers only optional account login and cloud sync. On the startup screen ("Supabase 연결 설정"), click **"설정 전 - 이 기기에만 저장 (로컬 모드)"** (local mode) or use guest mode to enter and exercise the full planner UI without any credentials. Core flows (weekly/monthly/yearly planner, habits, mandalart, memos) all work in this mode.

### Optional cloud/integration env vars
Cloud sync, Google sign-in, AI memo classification, and push are optional and disabled unless env vars are provided (see `.env.example`). Put them in `.env.local` (or Cursor Secrets). Notes:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` must all belong to the **same** Supabase project — `server/supabaseEnv.js` validates the project ref and the dev server logs a Korean warning if they mismatch or are absent (the warning is harmless when only running local mode).
- Supabase schema/migrations live in `supabase/` (`schema.sql`, `RUN_THIS.sql`, `migrations/*`) and must be applied to the target project before cloud sync/login will work.
- Gemini (`GEMINI_API_KEY`) falls back to local keyword rules when unset; Web Push needs VAPID keys + a Postgres URL.
