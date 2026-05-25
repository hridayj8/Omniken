# Omniken — Supabase Backend

This directory contains everything needed to connect the Omniken SaaS to your Supabase project.

## Project Reference

`nhkscsynarfbwgfcrgva` — Supabase project for Omniken

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | Full database schema — run in SQL Editor |
| `rls-policies.sql` | Row Level Security policies — run after schema |
| `seed.sql` | Sample data for development |
| `config.toml` | Supabase local dev configuration |
| `.env.example` | Environment variable template |
| `migrations/001_initial_schema.sql` | Migration file for `supabase migration up` |
| `functions/*.sql` | Stored procedures for checkout, license activation, usage logging, dashboard stats |

## Setup

### 1. Run Schema

Open your Supabase Dashboard → **SQL Editor** and paste/run `schema.sql`, then `rls-policies.sql`, then `seed.sql`.

### 2. Get Connection String

From Supabase Dashboard → **Project Settings → Database**:

```
postgresql://postgres:[YOUR-PASSWORD]@db.ppbepczquphfpmxfelyk.supabase.co:5432/postgres
```

### 3. Get API Keys

From Supabase Dashboard → **Project Settings → API**:

- `SUPABASE_URL` = `https://nhkscsynarfbwgfcrgva.supabase.co`
- `SUPABASE_SERVICE_KEY` = `service_role` key (keep secret — never in client code)

### 4. Create `.env` in `omniken/`

```env
SUPABASE_URL=https://nhkscsynarfbwgfcrgva.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.ppbepczquphfpmxfelyk.supabase.co:5432/postgres
```

### 5. Prisma

```bash
npx prisma generate
npx prisma db push
```

## Tables

- **users** — User accounts (auth + profile)
- **licenses** — Founder ($89/yr) and Elite ($179/yr) license keys
- **api_keys** — Hashed API keys for MCP/LangChain access
- **usage_logs** — Per-prompt token optimization tracking (text/image/audio/video)
- **checkout_sessions** — Stripe/payment gateway session tracking

## Stored Procedures

| Function | Description |
|----------|-------------|
| `create_checkout_session(email, tier)` | Creates a pending checkout + generates license key |
| `activate_license(session_id, stripe_id)` | Activates license after successful payment |
| `log_usage(user_id, prompt_in, prompt_out, model, input_type, context_cache)` | Records a token optimization event |
| `get_dashboard_stats(user_id)` | Returns aggregate stats for the user dashboard |
| `get_user_savings_summary(user_id)` | Returns total savings across all prompts |
| `verify_license(license_key)` | Checks if a license key is valid and active |

## RLS

All tables have Row Level Security enabled. Authenticated users can only access their own data. The `service_role` key has full access for server-side operations (MCP server, Streamlit backend).

## Deployment

**Vercel** serves the frontend (`omniken/index.html`). **Streamlit Cloud** serves the Python app (`omniken/app.py`). Both connect to this same Supabase project.
