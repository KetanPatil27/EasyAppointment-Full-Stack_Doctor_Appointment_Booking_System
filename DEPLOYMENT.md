# EasyAppointment — Render + MongoDB Atlas Deployment Guide

A complete, battle-tested guide for deploying this full-stack app to Render's free tier with MongoDB Atlas as the database. Written after going through every gotcha live so you don't have to.

If you follow this in order, the deployment takes about **45 minutes**. If you skip a step, expect to lose a day debugging a misleading TLS error.

---

## Table of contents

1. [Architecture](#1-architecture)
2. [Prerequisites](#2-prerequisites)
3. [Pre-flight: prepare the code](#3-pre-flight-prepare-the-code)
4. [MongoDB Atlas setup](#4-mongodb-atlas-setup)
5. [Resend email setup](#5-resend-email-setup)
6. [Backend deployment on Render](#6-backend-deployment-on-render)
7. [Frontend deployment on Render](#7-frontend-deployment-on-render)
8. [Wire backend ↔ frontend ↔ email](#8-wire-backend--frontend--email)
9. [Smoke test](#9-smoke-test)
10. [Complete environment-variables reference](#10-complete-environment-variables-reference)
11. [Mistakes solved during deployment — read this](#11-mistakes-solved-during-deployment--read-this)
12. [Free-tier limitations & paid upgrades](#12-free-tier-limitations--paid-upgrades)

---

## 1. Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐         ┌────────────────────────┐
│  Frontend (Next.js 16)      │         │  Backend (Feathers.js v5)    │         │  MongoDB Atlas         │
│  Render Web Service (free)  │ ──────► │  Render Web Service (free)   │ ──────► │  M0 Free Cluster (512MB)│
│  *.onrender.com             │  HTTPS  │  *.onrender.com              │  TLS    │  *.mongodb.net          │
└─────────────────────────────┘         └──────────────────────────────┘         └────────────────────────┘
                                                       │
                                                       │ HTTPS
                                                       ▼
                                              ┌──────────────────┐
                                              │  Resend Email    │
                                              │  (HTTPS API)     │
                                              └──────────────────┘
```

**Why this combination:**
- **Render** — free tier for both backend and frontend. Auto-deploys from GitHub.
- **MongoDB Atlas** — Render doesn't host MongoDB; Atlas's M0 free tier (512 MB) is the standard pairing.
- **Resend** — Render's free tier blocks outbound SMTP, so Gmail / Mailgun SMTP all fail. Resend uses HTTPS port 443, which is always open.

---

## 2. Prerequisites

| Tool | Why | Where |
|---|---|---|
| GitHub account | Render pulls code from GitHub | github.com |
| The code pushed to a public or private GitHub repo | Render needs to clone it | — |
| Node.js 20+ on your laptop | For local production build verification | nodejs.org |
| `mongosh` CLI on your laptop | For testing the Atlas connection string | mongodb.com/try/download/shell |

You don't need accounts for Render / Atlas / Resend yet — we'll create them in the relevant sections.

---

## 3. Pre-flight: prepare the code

### 3.1 Verify production builds work locally

```powershell
# Backend
cd backend-appointment-fixed/backend
npm install
npm run compile   # produces lib/*.js
npm start         # should boot without errors (Ctrl+C to stop)

# Frontend
cd ../../frontend-appointment-fixed/frontend
npm install
npm run build     # produces .next/
npm start         # should boot on http://localhost:3000
```

If either fails locally, **fix it before touching Render**. Render's build environment is stricter than your laptop.

### 3.2 Generate a production JWT secret

The `JWT_SECRET` in your local `.env` MUST NOT be reused for production. Generate a fresh 256-bit one:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save the 64-char hex output somewhere safe — you'll paste it into Render in §6.

### 3.3 Make sure all your changes are committed and pushed

```powershell
git status              # should show "nothing to commit, working tree clean"
git push origin main    # Render reads from this
```

---

## 4. MongoDB Atlas setup

### 4.1 Create the cluster

1. https://cloud.mongodb.com → **Sign up** (free) or **Sign in**.
2. Click **+ Create** to create a new cluster.
3. Choose **M0 FREE** ($0/month, 512 MB RAM).
4. **Provider: AWS**, **Region: Singapore (ap-southeast-1)** ⚠️
   - **Critical:** match this region to whichever Render region you'll use for the backend (also Singapore). Cross-region free-tier paths cause the misleading TLS error described in §11.
5. Cluster name: `easyappointment-prod`.
6. Click **Create**. Wait ~3 minutes for provisioning.

### 4.2 Create a database user

1. Sidebar → **Database Access** → **Add new database user**.
2. **Authentication Method:** Password.
3. **Username:** `easyappointment-app`
4. **Password:** click **Autogenerate Secure Password** → **copy it now** (you only see it once).
   - ⚠️ **Verify the password contains only letters and digits.** Special characters like `@ : / # %` need URL encoding in the connection string and cause subtle "bad auth" errors. If autogeneration produces specials, click again until you get a clean one. Or set a custom alphanumeric password like `MyP4ssw0rd2026Secure`.
5. **Database User Privileges:** "Read and write to any database."
6. Click **Add User**.

### 4.3 Network access — `0.0.0.0/0` ⚠️ critical

1. Sidebar → **Network Access** → **Add IP Address**.
2. Click **Allow access from anywhere** (`0.0.0.0/0`).
3. **Confirm**.

> **Why allow-all?** Render's free tier doesn't have static IPs, so you can't allowlist specific addresses. The strong DB password is what protects you.
>
> **Why this is the most important step on this page:** if you skip it, Atlas rejects every connection from Render with the cryptic error `tlsv1 alert internal error: SSL alert number 80`. We chased that error through every Node version, mongodb driver version, and TLS option for hours before realizing it was just the missing allowlist (see §11.6).

### 4.4 Get the connection string

1. Cluster page → **Connect** → **Drivers** → Node.js.
2. Copy the URI:
   ```
   mongodb+srv://easyappointment-app:<password>@easyappointment-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `<password>` with the actual password from §4.2.
4. Add `/easyappointment` before the `?` so the URI ends:
   ```
   …mongodb.net/easyappointment?retryWrites=true&w=majority
   ```

**Final URI shape:**
```
mongodb+srv://easyappointment-app:YOUR_REAL_PASSWORD@easyappointment-prod.xxxxx.mongodb.net/easyappointment?retryWrites=true&w=majority
```

### 4.5 Verify the URI works locally before touching Render

```powershell
mongosh "<your full URI>"
```

You should see `easyappointment-prod>` prompt within 5 seconds. If you get any other behavior, **stop and fix the URI before continuing** — the same error will hit Render.

---

## 5. Resend email setup

Render's free tier blocks all outbound SMTP. Email **must** go through an HTTPS API. We use Resend (free 3,000 emails/month).

### 5.1 Sign up

1. https://resend.com → **Sign up** with the email address you want to send TEST emails TO.
   - ⚠️ Until you verify a custom domain, you can only send to your signup address. Pick one you can read.
2. Confirm the email Resend sends you.

### 5.2 Create an API key

1. Resend dashboard → **API Keys** → **Create API Key**.
2. Name: `EasyAppointment Render`.
3. Permission: **Sending access**.
4. Click **Add**.
5. Copy the key — starts with `re_`. **You only see it once.**

### 5.3 Optional: verify a domain

If you own a domain (e.g., `mysite.com`):

1. Resend → **Domains** → **Add Domain**.
2. Resend gives you DNS records (TXT, MX) — add them at your domain registrar.
3. Wait for verification (5-30 min).
4. Once verified, you can send TO any email address.

For a demo without a domain, skip this — you can send only to your signup email.

---

## 6. Backend deployment on Render

### 6.1 Create the Web Service

1. https://render.com → **Sign in with GitHub**, authorize the repo.
2. Dashboard → **New** → **Web Service** → pick your `EasyAppointment-Full-Stack...` repo.
3. Configure:

| Field | Value |
|---|---|
| Name | `easyappointment-backend` |
| Region | Singapore (must match Atlas region from §4.1) |
| Branch | `main` |
| **Root Directory** | `backend-appointment-fixed/backend` ⚠️ |
| Runtime | Node |
| **Build Command** | `npm install --include=dev && npm run compile` ⚠️ |
| **Start Command** | `npm start` |
| Instance Type | Free |

> ⚠️ **Why `--include=dev`?** When `NODE_ENV=production`, npm skips `devDependencies` by default. Build tools like `shx` and `typescript` live there, so the build fails with `shx: not found`. The `--include=dev` flag forces them in. This is THE single most common Render deployment failure for TS projects.

### 6.2 Set environment variables

Scroll down to **Environment Variables** and click **Add Environment Variable** for each row:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.11.0` ⚠️ pin a specific LTS, don't let Render pick "latest" |
| `MONGODB_URI` | The full URI from §4.4 |
| `JWT_SECRET` | The 64-char hex from §3.2 |
| `RESEND_API_KEY` | The `re_...` key from §5.2 |
| `RESEND_FROM` | `EasyAppointment <onboarding@resend.dev>` (or `name@your-verified-domain.com` if you did §5.3) |
| `ALLOWED_ORIGINS` | Leave **blank** for now — fill in §8 after frontend exists |
| `COOKIE_SAMESITE` | `none` ⚠️ required for cross-subdomain cookies on `*.onrender.com` |
| `FRONTEND_URL` | Leave **blank** for now — fill in §8 |

> **Don't set:**
> - `PORT` — Render assigns it automatically. Setting it manually breaks port binding.
> - `MAIL_USER`, `MAIL_PASS` — these are for local dev only. Don't use them on Render (SMTP is blocked).

### 6.3 Click "Create Web Service"

First build takes ~5 minutes.

### 6.4 First deploy will fail with a clear, expected error

You'll see in the Logs:
```
error: No CORS origins configured for production. Set ALLOWED_ORIGINS env var.
```

**That's intentional** — the server's fail-fast guard refuses to start without CORS configured. We'll fix this in §8 once the frontend exists. **Don't redeploy yet.**

### 6.5 Note the backend URL

Even though startup failed, Render assigns the URL: `https://easyappointment-backend.onrender.com` (your name may differ — copy from the dashboard).

---

## 7. Frontend deployment on Render

### 7.1 Create another Web Service

Render dashboard → **New** → **Web Service** → same repo:

| Field | Value |
|---|---|
| Name | `easyappointment-frontend` |
| Region | Singapore (match backend) |
| Branch | `main` |
| **Root Directory** | `frontend-appointment-fixed/frontend` |
| Runtime | Node |
| **Build Command** | `npm install --include=dev && npm run build` ⚠️ same `--include=dev` reason |
| **Start Command** | `npm start` |
| Instance Type | Free |

### 7.2 Frontend env vars

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.11.0` |
| `NEXT_PUBLIC_API_URL` | `https://easyappointment-backend.onrender.com` (the backend URL from §6.5) |

> **Important:** `NEXT_PUBLIC_*` variables are inlined at **build time**, not runtime. If you change `NEXT_PUBLIC_API_URL` later, you must trigger a rebuild — click **Manual Deploy** → **Clear build cache & deploy**.

### 7.3 Click Create

First build takes ~6–8 minutes (Next.js is slow). Note the frontend URL: `https://easyappointment-frontend.onrender.com`.

---

## 8. Wire backend ↔ frontend ↔ email

Now that both URLs exist, fill in the env vars we left blank.

### 8.1 Backend

Render → **easyappointment-backend** → **Environment**:

| Key | Value |
|---|---|
| `ALLOWED_ORIGINS` | `["https://easyappointment-frontend.onrender.com"]` ⚠️ MUST be a JSON array string, not just a URL |
| `FRONTEND_URL` | `https://easyappointment-frontend.onrender.com` (no trailing slash) |

> ⚠️ **Why `ALLOWED_ORIGINS` is JSON:** the Feathers `config` library parses this env var as JSON. Pasting a plain URL causes `JSON5: invalid character 'h' at 1:1`. Wrap in `[" "]`. See §11.5.

**Save Changes.** Backend auto-redeploys (~1 min). Watch logs for `info: Feathers app listening on http://localhost:10000` and `==> Detected open port 10000` — that's success.

### 8.2 Verify both are alive

Open these in a browser:
- `https://easyappointment-backend.onrender.com/doctors` → should return JSON `{"total":0,"data":[],"limit":10,"skip":0}`. (First hit may take ~30s due to free-tier sleep.)
- `https://easyappointment-frontend.onrender.com` → landing page loads.

---

## 9. Smoke test

### 9.1 Critical UX flows

| Flow | Steps | Expected |
|---|---|---|
| Patient register | Sign up at `/register` | Redirected to `/dashboard` |
| Patient login | Log out, log back in | Dashboard loads, no bounce-back |
| Forgot password | `/forgot-password` → enter your Resend signup email | Email arrives within 1 min, link points to your **deployed** frontend (not localhost) |
| Doctor register | Sign up as doctor | Doctor dashboard with pending approval |
| Promote to admin | In Atlas Compass: change a user's `role` to `admin` | Re-login via `/admin/login`, dashboard loads |
| Admin approves doctor | Admin → Doctors → Approve | Doctor visible in patient view |
| Doctor creates slot | Doctor dashboard → Slots → New | Slot appears |
| Patient books slot | Browse doctors → pick slot → book | Confirmation email arrives |

### 9.2 Cookie sanity check (DevTools)

| Check | Expected |
|---|---|
| Application → Cookies → `easyappointment-backend.onrender.com` after login | `accessToken` cookie: `HttpOnly ✓ Secure ✓ SameSite=None` |
| Application → Local Storage on frontend domain | `currentUser` present, **no** `accessToken` |

### 9.3 If login bounces back to `/login`

The single most common deploy bug. In order of likelihood:

1. `COOKIE_SAMESITE=none` not set on backend → see §6.2.
2. `ALLOWED_ORIGINS` doesn't match the frontend URL byte-for-byte (trailing slash, http vs https) → §8.1.
3. The browser still has stale cookies/localStorage from a previous broken deploy. Clear them and retry.

---

## 10. Complete environment-variables reference

### Backend (`easyappointment-backend`)

| Key | Required? | Example | Notes |
|---|---|---|---|
| `NODE_ENV` | ✅ | `production` | Triggers strict CORS checks, secure cookies, prod rate limits. |
| `NODE_VERSION` | ✅ | `22.11.0` | Pin to a specific LTS; never let Render pick "latest". |
| `MONGODB_URI` | ✅ | `mongodb+srv://user:pass@host.mongodb.net/easyappointment?...` | From Atlas. URL-encode special characters in password. |
| `JWT_SECRET` | ✅ | 64-char hex string | Generate fresh per environment. Server refuses to start if <32 chars. |
| `ALLOWED_ORIGINS` | ✅ | `["https://easyappointment-frontend.onrender.com"]` | JSON array string. Server refuses to start if missing in production. |
| `COOKIE_SAMESITE` | ✅ | `none` | Required for `*.onrender.com` (cross-subdomain). Forces `Secure: true`. |
| `RESEND_API_KEY` | ✅ | `re_xxx...` | Resend HTTPS email. Required because Render blocks SMTP. |
| `RESEND_FROM` | optional | `EasyAppointment <onboarding@resend.dev>` | From-address. Default works for testing. |
| `FRONTEND_URL` | ✅ | `https://easyappointment-frontend.onrender.com` | Used in email links. No trailing slash. |
| `MAIL_USER` | ❌ never set on Render | (gmail user) | Local-dev only. SMTP doesn't work on Render. |
| `MAIL_PASS` | ❌ never set on Render | (16-char app password) | Local-dev only. |
| `PORT` | ❌ DON'T set | (auto by Render) | Render injects this; manual override breaks port binding. |

### Frontend (`easyappointment-frontend`)

| Key | Required? | Example | Notes |
|---|---|---|---|
| `NODE_ENV` | ✅ | `production` | Standard Next.js production mode. |
| `NODE_VERSION` | ✅ | `22.11.0` | Match the backend. |
| `NEXT_PUBLIC_API_URL` | ✅ | `https://easyappointment-backend.onrender.com` | **Inlined at build time.** Changing this requires "Clear build cache & deploy". |

---

## 11. Mistakes solved during deployment — read this

These are real failures we hit, in chronological order. Knowing them in advance saves hours.

### 11.1 `shx: not found` on first build

**Symptom:**
```
> easyappointment@1.0.0 compile
> shx rm -rf lib/ && tsc
sh: 1: shx: not found
==> Build failed
```

**Cause:** `shx` and `typescript` are in `devDependencies`. When Render sets `NODE_ENV=production`, `npm install` silently omits dev deps.

**Fix:** Build command must be `npm install --include=dev && npm run compile`. Same applies to the frontend's `@tailwindcss/postcss`.

### 11.2 Node 26 + Atlas TLS handshake failure

**Symptom:** `tlsv1 alert internal error: SSL alert number 80` in backend startup logs. Backend won't connect to Atlas.

**Cause:** Render auto-picks the latest Node when `package.json` says `"engines": { "node": ">= 18.0.0" }`. Node 26's OpenSSL 3.x has stricter TLS defaults that some Atlas deployments don't negotiate cleanly.

**Fix:** Set `NODE_VERSION=22.11.0` env var on Render. Always pin a specific LTS, never let Render pick "latest".

### 11.3 `ERR_REQUIRE_ESM` from `isomorphic-dompurify`

**Symptom:**
```
Error [ERR_REQUIRE_ESM]: require() of ES Module
@exodus/bytes/encoding-lite.js from html-encoding-sniffer
```

**Cause:** `isomorphic-dompurify` pulls in `jsdom` → `html-encoding-sniffer` → an ESM-only package. CommonJS Feathers code can't `require()` ESM modules on Node 22.

**Fix:** Replace `isomorphic-dompurify` with `sanitize-html` — pure JS, no DOM emulation, no ESM-from-CJS hazards. Same `allowedTags: []` semantics.

### 11.4 Pinning `mongodb` to v5 — DON'T

**Symptom:** Tempted to downgrade `mongodb` package to v5 to dodge a TLS issue with v6.

**Cause:** `@feathersjs/mongodb@5.x` has **always** required `mongodb@^6` as a peer dependency. There is no version of the Feathers adapter that accepts mongodb v5. Local installs may silently allow it via lockfile state, but a clean `npm install` on Render fails with `ERESOLVE could not resolve`.

**Fix:** Don't go down this road. Stay on `mongodb@^6.0.0`. The TLS issue is solved by §11.6, not the driver version.

### 11.5 `ALLOWED_ORIGINS` JSON parse error at startup

**Symptom:**
```
SyntaxError: __format parser error in ALLOWED_ORIGINS: JSON5: invalid character 'h' at 1:1
```

**Cause:** This project's `config/custom-environment-variables.json` declares `ALLOWED_ORIGINS` with `__format: "json"`. The Feathers config library tries to parse the env var as JSON before any application code runs. A plain URL like `https://easyappointment-frontend.onrender.com` starts with `h`, which is invalid JSON.

**Fix:** Wrap the URL in JSON array brackets:
```
["https://easyappointment-frontend.onrender.com"]
```
For multiple origins:
```
["https://example.com","https://www.example.com"]
```

### 11.6 ⭐ The big one — `tlsv1 alert internal error` from Atlas

**Symptom:** Repeated `MongoServerSelectionError: ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` from MongoDB driver, even though:
- DNS resolution works (you can see the shard hostnames in the error log)
- `mongosh` from your laptop connects fine with the same URI
- All Node versions (20, 22, 24, 26) fail identically

**Cause:** **Missing `0.0.0.0/0` in Atlas Network Access.** Atlas's M0 free tier responds to non-allowlisted source IPs with a misleading TLS error (alert 80) instead of a clean "IP not allowed" error. This is a documented Atlas behavior that has cost the community countless hours of debugging.

**Fix:** Atlas → Network Access → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`).

> If you've already done this and still get the TLS error, **also** verify your cluster region is Singapore (matching Render). Cross-region paths between Atlas and Render free tier have intermittent TLS issues.

### 11.7 `bad auth: authentication failed` from Atlas

**Symptom:** After fixing 11.6, the next error is `MongoServerError: bad auth: authentication failed`.

**Cause:** Wrong username/password in `MONGODB_URI`. Common reasons:
- Forgot to substitute `<password>` placeholder with the real one
- Special characters in password not URL-encoded (`@` → `%40`, `:` → `%3A`, etc.)
- Password copy includes leading/trailing whitespace

**Fix:**
1. Test the URI with `mongosh "<URI>"` from your laptop first. If `mongosh` fails with the same error, the URI is wrong.
2. Regenerate the Atlas password as alphanumeric-only (Database Access → user → Edit Password) to dodge URL-encoding entirely.

### 11.8 `ETIMEDOUT` on email send

**Symptom:**
```
[Email] Failed to send confirmation
  mailUserSet: true,
  mailPassSet: true,
  error: 'Connection timeout',
  code: 'ETIMEDOUT'
```

**Cause:** Render's free tier blocks all outbound SMTP (ports 25, 465, 587). Gmail / Mailgun / Brevo / SendGrid SMTP all fail the same way.

**Fix:** Switch to an HTTPS-based email API. We use Resend in this project. See §5 and the mailer code in `backend-appointment-fixed/backend/src/utils/mailer.ts` — it picks Resend automatically when `RESEND_API_KEY` is set.

### 11.9 Email links point to `localhost`

**Symptom:** Password reset email arrives, but the link is `http://localhost:3000/reset-password?token=...` instead of the deployed frontend.

**Cause:** `FRONTEND_URL` env var not set on the backend; the mailer falls back to its dev default.

**Fix:** Set `FRONTEND_URL=https://easyappointment-frontend.onrender.com` on the backend service. **No trailing slash.**

### 11.10 Login succeeds but dashboard bounces back to `/login`

**Symptom:** You enter credentials, the API returns 200, but you immediately end up back on the login page.

**Cause:** One of:
1. `COOKIE_SAMESITE` not set to `none` on the backend → browser drops the cookie because `*.onrender.com` subdomains are cross-site (Public Suffix List).
2. `ALLOWED_ORIGINS` doesn't match the frontend URL exactly (trailing slash, http vs https, www vs non-www).
3. Stale state from a previous broken deploy in your browser.

**Fix order:**
1. Confirm `COOKIE_SAMESITE=none` is set on backend.
2. Confirm `ALLOWED_ORIGINS` matches the frontend URL byte-for-byte.
3. Clear cookies + localStorage in DevTools → Application, hard reload, retry.

### 11.11 Stale JWT cookies pointing at non-existent users

**Symptom:** After swapping databases (e.g., Mumbai cluster → Singapore cluster), some requests log `NotFound: No record found for id 'xxx'` from the JWT strategy.

**Cause:** The browser still has a valid (signed) JWT cookie whose `sub` claim points at a user ID from the old database.

**Fix:** Clear cookies and localStorage on the frontend domain. Or expect users to be logged out once after any DB migration.

### 11.12 Resend "you can only send testing emails to your own email address"

**Symptom:** Production email API call returns 403 with that message.

**Cause:** Resend free tier requires you to verify a domain before sending to arbitrary addresses. Until verified, you can only send to your Resend signup email.

**Fix:** Either (a) test by sending to your signup email, or (b) verify a domain at resend.com/domains (free if you own the domain).

---

## 12. Free-tier limitations & paid upgrades

### What you get free

| Resource | Free quota | Notes |
|---|---|---|
| Render Web Service | 750 instance-hours/month | Two services that sleep when idle stay well within. |
| MongoDB Atlas M0 | 512 MB storage | Shared CPU, no autoscaling. |
| Resend | 3,000 emails/month, 100/day | Plenty for demos. |

### Free-tier gotchas you'll hit

1. **15-minute sleep on Render.** Services that get no requests for 15 min spin down. First request after sleep takes 30–50s. Visitors see a blank loading page.
2. **No static IPs.** Hence Atlas needs `0.0.0.0/0`.
3. **No persistent disk on Web Services.** Anything you write to local disk is lost on redeploy. File uploads must go to S3/Cloudinary.
4. **No background workers / cron jobs.** Email retries, scheduled cleanups need an upgrade.
5. **Outbound SMTP blocked.** Hence Resend.

### When to upgrade

| Need | Cheapest fix |
|---|---|
| No more 30s cold starts | Render Starter ($7/mo per service) |
| > 512 MB DB | Atlas M2 ($9/mo) |
| Higher email volume | Resend Pro ($20/mo, 50k emails) OR verify a domain to get pro features at lower tiers |
| Cron jobs / background tasks | Render's Background Worker ($7/mo) |

For this project, free tier is sufficient for a school demo, internship presentation, or small portfolio.

---

## Final notes

- After deploy, **rotate any password or secret you typed into a chat or pasted in a screenshot.** Treat them as compromised.
- `.env` is in `.gitignore` — never commit it. `.env.example` is the documented template.
- The first `git push` after Phase-1 hardening is what makes Render pull the production-ready code; verify the most recent Render deploy references your latest commit hash.
- All env vars on Render are encrypted at rest. Render's logs scrub them automatically — but assume they leak through stack traces, so don't reuse them across projects.

---

*Last updated after a real deployment that hit every issue in §11. If you find a new gotcha, add it.*
