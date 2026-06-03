# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

**DemandIQ 2.0** is a single-repo demand-planning app: Next.js UI (`/workspace`), Supabase (auth + Postgres), and a Python FastAPI forecast engine in `forecast_engine/` (port **8000**). Most dashboard pages use `lib/mock-data.ts`; live Supabase is required for auth and CSV import.

### Services to run locally

| Service | Command | Port |
|---------|---------|------|
| Next.js (required) | `npm run dev` | 3000 |
| Forecast engine (required for ML flows) | Docker (recommended) or venv + uvicorn | 8000 |
| Supabase | Hosted project only (no local stack in repo) | — |

### Environment variables

Create `/workspace/.env.local` (gitignored). Minimum:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_FORECAST_API=http://localhost:8000
```

Without real Supabase credentials, enable demo mode in `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_DEMO_AUTH=true
```

Then use **Connexion démo** on `/auth` (or `demo@demandiq.local` / `demo1234`). CSV import in demo mode saves to `localStorage` via `lib/local-import-store.ts`.

**If Supabase secrets are skipped in Cloud setup**, you can still verify the environment with:

- `npm run typecheck` and `npm run build`
- `npm run dev` → open `http://localhost:3000/auth` (UI shell)
- Forecast engine `curl -s http://localhost:8000/health` and `POST /forecast` (see README)
- Most dashboard pages use `lib/mock-data.ts`, but the app shell blocks `/dashboard/*` until a user signs in via Supabase

Apply SQL migrations from `supabase/migrations/` via the Supabase dashboard or `supabase db push` when credentials are available.

### Forecast engine (important)

- **Pinned `requirements.txt` targets Python 3.11** and fails on the VM’s default Python 3.12 (`numpy==1.24.3` has no wheels).
- **Recommended:** build and run the Docker image (matches README):

```bash
cd forecast_engine
sudo docker build -t demandiq-forecast:latest .
sudo docker rm -f demandiq-forecast 2>/dev/null
sudo docker run -d --name demandiq-forecast -p 8000:8000 demandiq-forecast:latest
curl -s http://localhost:8000/health
```

- **Alternative (venv on Python 3.12):** create `forecast_engine/.venv`, then install with compatible pins (e.g. `numpy>=1.26`, `statsmodels>=0.14.1`) before `pip install -r requirements.txt` or install packages manually. Run:

```bash
cd forecast_engine
.venv/bin/uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

- `app.py` had a broken unused import (`statsmodels.tsa.arima.utils.ndiffs`) and `Dict[str, any]` instead of `Any`; both are fixed so the service starts on current statsmodels.

### Standard commands (see `package.json` / README)

| Task | Command |
|------|---------|
| Install frontend deps | `npm install` |
| Dev server | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| Lint | `npm run lint` (known pre-existing `react/no-unescaped-entities` errors in comparison/models pages; build skips lint) |

### tmux sessions

Use descriptive tmux session names when starting long-running processes, e.g. `nextjs-dev` and `forecast-api`.

### Gotchas

- Dashboard routes redirect unauthenticated users to `/auth` (`components/app-shell.tsx`).
- Forecast `POST /forecast` requires **at least 5** history points (sparse monthly series).
- Sample furniture CSV: `forecast_engine/demo_furniture_sales.csv` — run `python3 forecast_engine/run_forecast_from_csv.py`.
- `npm run lint` may fail on existing JSX quote rules; `npm run build` still succeeds.
- Docker in this VM needs `sudo` for `docker` commands unless your user is in the `docker` group.
