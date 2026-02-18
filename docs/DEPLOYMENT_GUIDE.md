# SD4 Deployment Guide — Step-by-Step Instructions

This guide walks you through deploying SD4 online with password protection. The code is already set up; you need to complete the steps below.

---

## Part 1: Create a Turso Database (Cloud SQLite)

Turso is a hosted SQLite database. You need it because Vercel (where we'll host the app) doesn't support local files.

### Step 1.1: Install the Turso CLI

Open **Terminal** (or your command-line app) and run:

```bash
brew install tursodatabase/tap/turso
```

If you don't have Homebrew, install it first from https://brew.sh

### Step 1.2: Sign Up or Log In

```bash
turso auth signup
```

This opens a browser. Create an account (or log in if you already have one).

### Step 1.3: Create the Database

**For Australian users** (Vercel is already set to Sydney via `vercel.json`):

```bash
turso db create sd4-demo --location nrt
```

- `nrt` = Tokyo — Turso’s closest region to Australia (no Sydney yet). ~100–150ms from Sydney.
- Run `turso db locations --show-latencies` to see current regions and pick the best for your location.

**For US/Europe users:**

```bash
turso db create sd4-demo --location iad   # US East
turso db create sd4-demo --location lhr  # London
```

- Full list: https://turso.tech/docs/reference/database-regions

### Step 1.4: Get Your Database URL

```bash
turso db show sd4-demo
```

In the output, find the line that looks like:

```
URL: libsql://sd4-demo-<your-org>.turso.io
```

Copy that full URL (including `libsql://`). You'll need it for Vercel.

### Step 1.5: Create an Auth Token

```bash
turso db tokens create sd4-demo
```

Copy the long token that appears. You'll add it to Vercel as `TURSO_AUTH_TOKEN`.

---

## Part 2: Push Your Code to GitHub

If your project isn't on GitHub yet:

### Step 2.1: Create a GitHub Repository

1. Go to https://github.com/new
2. Name it (e.g. `sd4` or `sd4-demo`)
3. Choose **Private** if you don't want it public
4. Click **Create repository** (don't add a README or .gitignore)

### Step 2.2: Push Your Code

In Terminal, from your project folder (`/Users/ryanabcc/Documents/DEX/sd4`):

```bash
cd /Users/ryanabcc/Documents/DEX/sd4
git add .
git commit -m "Add deployment support"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

---

## Part 3: Deploy on Vercel

### Step 3.1: Sign Up for Vercel

1. Go to https://vercel.com
2. Sign up (or log in) with your GitHub account

### Step 3.2: Import Your Project

1. Click **Add New** → **Project**
2. Select your GitHub repository (e.g. `sd4`)
3. Click **Import**

### Step 3.3: Add Environment Variables

Before deploying, add these variables in the Vercel project settings:

1. In the import screen, expand **Environment Variables**
2. Add each variable:

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | `libsql://sd4-demo-XXXX.turso.io` | The URL from Step 1.4 |
| `TURSO_AUTH_TOKEN` | `eyJ...` (long token) | The token from Step 1.5 |
| `DEMO_ACCESS_PASSWORD` | Your chosen password | e.g. `demo2024` — share this with stakeholders |

3. Click **Deploy**

### Step 3.4: Wait for the Build

Vercel will build and deploy. When it finishes, you'll get a URL like:

```
https://sd4-xxxx.vercel.app
```

---

## Part 4: Set Up the Database Schema

The database is empty. You need to create the tables.

### Step 4.1: Run Prisma Against Turso Locally

In Terminal, from your project folder:

```bash
cd /Users/ryanabcc/Documents/DEX/sd4
DATABASE_URL="libsql://sd4-demo-YOUR_ORG.turso.io" TURSO_AUTH_TOKEN="YOUR_TOKEN" npx prisma db push
```

Replace:
- `libsql://sd4-demo-YOUR_ORG.turso.io` with your actual Turso URL
- `YOUR_TOKEN` with your Turso auth token

This creates all the tables in your Turso database.

### Step 4.2: Seed the Demo (Optional)

After the first deploy, when you visit the app and log in with your password, click **Try Demo** on the projects page. That will create the demo project. You can also run the seed manually if you add an API route for it later.

---

## Part 5: Pushing Updates

When you make changes and want to deploy a new version:

1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your change description"
   git push
   ```

2. Vercel will automatically detect the push and redeploy. Your live URL will update within a few minutes.

---

## Summary Checklist

- [ ] Install Turso CLI (`brew install tursodatabase/tap/turso`)
- [ ] Create Turso account (`turso auth signup`)
- [ ] Create database (`turso db create sd4-demo --location nrt`)
- [ ] Get database URL (`turso db show sd4-demo`)
- [ ] Create auth token (`turso db tokens create sd4-demo`)
- [ ] Push code to GitHub
- [ ] Create Vercel account and import project
- [ ] Add `DATABASE_URL`, `TURSO_AUTH_TOKEN`, `DEMO_ACCESS_PASSWORD` in Vercel
- [ ] Deploy
- [ ] Run `prisma db push` with Turso URL and token
- [ ] Visit your Vercel URL, enter password, click Try Demo

---

## Australian Deployment (Sydney)

For users primarily in Australia:

1. **Vercel** — Already configured in `vercel.json` with `"regions": ["syd1"]` (Sydney). Requires Vercel Pro for region selection; on Hobby, functions may still run in a default region.
2. **Turso** — No Sydney region yet. Use **Tokyo (`nrt`)** — the closest option (~100–150ms from Sydney):
   ```bash
   turso db create sd4-demo --location nrt
   ```
3. Run `./scripts/turso-migrate.sh sd4-demo` and set `DATABASE_URL` + `TURSO_AUTH_TOKEN` in Vercel.

---

## Fixing Slow Performance (3–4 second delays)

If simple actions take 3–4 seconds, your Turso database is likely in a different region than Vercel (e.g. Mumbai vs US East). **Move the database to US East (`iad`):**

1. **Create a new database in US East:**
   ```bash
   turso db create sd4-demo-us --location iad
   ```

2. **Get the new URL and token:**
   ```bash
   turso db show sd4-demo-us
   turso db tokens create sd4-demo-us
   ```

3. **Apply the schema:**
   ```bash
   ./scripts/turso-migrate.sh sd4-demo-us
   ```

4. **Update Vercel env vars** (Project → Settings → Environment Variables):
   - `DATABASE_URL` = new URL (e.g. `libsql://sd4-demo-us-ryana87.aws-us-east-1.turso.io`)
   - `TURSO_AUTH_TOKEN` = new token

5. **Redeploy** (Deployments → ⋮ → Redeploy).

6. **Optional:** Delete the old database: `turso db destroy sd4-demo`

---

## Australian Deployment (Sydney for AU users)

To run both the app and database in Australia for lowest latency:

### 1. Vercel — Sydney region

A `vercel.json` file is included that sets `"regions": ["syd1"]` so functions run in Sydney. **Note:** Sydney region may require a Vercel Pro plan.

### 2. Turso — Closest AU region

Run `turso db locations` (or `turso db locations -l` to see latencies from your machine) to list available regions. Look for:

- **`aws-ap-southeast-2`** — Sydney (if available)
- **`aws-ap-southeast-1`** — Singapore (closest alternative if Sydney unavailable)

Create the database:

```bash
# Try Sydney first; if not available, use Singapore
turso db create sd4-demo --location aws-ap-southeast-2
# or
turso db create sd4-demo --location aws-ap-southeast-1
```

Then run `./scripts/turso-migrate.sh sd4-demo` and set `DATABASE_URL` + `TURSO_AUTH_TOKEN` in Vercel.

---

## Troubleshooting

**"Module parse failed" or build errors**  
Clear the cache and rebuild: `rm -rf .next && npm run build`

**Database connection errors**  
Double-check `DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel. No extra spaces or quotes.

**Password not working**  
Ensure `DEMO_ACCESS_PASSWORD` is set in Vercel and matches what you type. Redeploy after changing env vars.

**Blank page or 500 error**  
Check Vercel's deployment logs (Project → Deployments → click latest → View Function Logs).
