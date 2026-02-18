# Migrating from Turso to Supabase

This guide walks you through migrating SD4 from Turso (SQLite/libSQL) to Supabase (PostgreSQL). Supabase has **Sydney (ap-southeast-2)** region support, ideal for Australian users.

---

## Part 1: Create a Supabase Project

### Step 1.1: Sign Up

1. Go to [supabase.com](https://supabase.com) and sign up (or log in).
2. Click **New Project**.
3. Choose your organization (or create one).
4. Fill in:
   - **Name**: e.g. `sd4-demo`
   - **Database Password**: Generate a strong password and save it.
   - **Region**: **Sydney (ap-southeast-2)** for Australian users.
5. Click **Create new project** and wait for it to provision.

### Step 1.2: Create a Prisma User (Recommended)

For better monitoring and access control, create a dedicated Prisma user:

1. In Supabase Dashboard → **SQL Editor**, run:

```sql
-- Create custom user (replace 'YOUR_STRONG_PASSWORD' with a strong password)
CREATE USER "prisma" WITH PASSWORD 'YOUR_STRONG_PASSWORD' BYPASSRLS CREATEDB;

-- Extend prisma's privileges
GRANT "prisma" TO "postgres";

-- Grant permissions on public schema
GRANT USAGE ON SCHEMA public TO prisma;
GRANT CREATE ON SCHEMA public TO prisma;
GRANT ALL ON ALL TABLES IN SCHEMA public TO prisma;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO prisma;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma;
```

2. Save the Prisma password for the next step.

### Step 1.3: Get Connection Strings

1. In Supabase Dashboard → **Project Settings** → **Database**.
2. Click **Connect** and choose **Connection string**.
3. Copy the **Session mode** (port 5432) and **Transaction mode** (port 6543) strings.

**Replace placeholders in the URL:**
- `[YOUR-PASSWORD]` → your Prisma password (or the project password if you skipped the Prisma user)
- `[DB-USER]` → `prisma` (if you created the Prisma user) or `postgres`

**URL formats:**
- **Session mode** (for migrations): `postgres://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`
- **Transaction mode** (for Vercel/serverless): `postgres://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`

---

## Part 2: Configure Environment Variables

### Step 2.1: Local `.env`

Create or update `.env`:

```env
# Supabase (PostgreSQL)
DATABASE_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgres://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

# Demo access (optional)
DEMO_ACCESS_PASSWORD="your-secret-password"
```

- **DATABASE_URL**: Use **Transaction mode** (port 6543) for the app.
- **DIRECT_URL**: Use **Session mode** (port 5432) for migrations.

### Step 2.2: Vercel Environment Variables

1. Vercel Dashboard → your project → **Settings** → **Environment Variables**.
2. Remove old Turso vars: `TURSO_AUTH_TOKEN` (no longer needed).
3. Add or update:
   - `DATABASE_URL` = Transaction mode URL (port 6543)
   - `DIRECT_URL` = Session mode URL (port 5432)
   - `DEMO_ACCESS_PASSWORD` = your password

---

## Part 3: Run Migrations

```bash
cd /Users/ryanabcc/Documents/DEX/sd4
npm install
npx prisma migrate deploy
```

This applies the schema to your Supabase database.

---

## Part 4: Deploy

```bash
git add .
git commit -m "Migrate to Supabase"
git push
```

Vercel will auto-deploy. After deploy, visit your app, log in with the password, and click **Try Demo**.

---

## Part 5: Verify

1. Visit `https://your-app.vercel.app/api/db-status` — should show `"ok": true` and `"database": "Supabase"`.
2. Log in and try the demo flow.

---

## Summary of Changes

| Before (Turso) | After (Supabase) |
|----------------|------------------|
| SQLite/libSQL | PostgreSQL |
| `libsql://` URL | `postgres://` URL |
| `TURSO_AUTH_TOKEN` | Not needed |
| `turso-migrate.sh` | `prisma migrate deploy` |
| Mumbai/Tokyo regions | **Sydney (ap-southeast-2)** |

---

## Troubleshooting

**"DATABASE_URL is required"**  
Ensure `DATABASE_URL` is set in `.env` (local) and Vercel env vars.

**"relation does not exist"**  
Run `npx prisma migrate deploy` against your Supabase database.

**Connection timeout**  
Use the Transaction pooler (port 6543) for `DATABASE_URL` in serverless. Use Session pooler (port 5432) for `DIRECT_URL` and migrations.

**SSL / connection errors**  
Ensure the connection string includes `?pgbouncer=true` when using the pooler, or check Supabase docs for the latest connection string format.
