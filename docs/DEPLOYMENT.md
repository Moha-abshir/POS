# Deployment Architecture

## Infrastructure Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Netlify       │     │    Railway       │     │      Neon        │
│   (Frontend)     │────▶│   (Backend)      │────▶│   (PostgreSQL)   │
│   React + Vite   │     │  Node.js/Express │     │   Serverless     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
             ┌──────▼──────┐          ┌───────▼──────┐
             │   Brevo     │          │  Cloudinary   │
             │   (Email)    │          │  (Images)     │
             └─────────────┘          └──────────────┘
                    
                    + Safaricom M-Pesa API (outbound only)
```

---

## Frontend — Netlify

**Deployment:** Push to `main` branch triggers automatic production deployment. Push to any other branch creates a preview deployment.

**Build command:** `npm run build` (Vite)

**Output directory:** `dist`

**Environment variables (Netlify dashboard):**
```
VITE_API_BASE_URL=https://your-backend.railway.app/api/v1
```

> Never put secrets in `VITE_` prefixed variables. These are bundled into the client.

---

## Backend — Railway

**Deployment:** Dockerized Node.js app. Railway detects the `Dockerfile` and builds automatically on push to `main`.

**`Dockerfile`** (to be created in Phase 1):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

**Environment variables (Railway dashboard):**
```
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...  (provided by Neon)

# JWT
JWT_SECRET=<generate with: openssl rand -hex 64>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# OTP
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RATE_LIMIT_WINDOW_MINUTES=15
OTP_RATE_LIMIT_MAX=3

# Email (Brevo)
BREVO_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com

# M-Pesa
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...
MPESA_CALLBACK_URL=https://your-backend.railway.app/api/v1/payments/mpesa/callback
MPESA_ENV=production  # or "sandbox"

# Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# CORS
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

---

## Database — Neon

**Plan:** The free tier is sufficient for development. Upgrade to a paid plan before production launch for guaranteed availability and longer backup retention.

**Branching workflow:**
- `main` branch = production database
- Create a `dev` branch from `main` for development
- Before running a migration on production: test it on a Neon branch created from a recent production snapshot

**Running migrations:**
```bash
# Development
npx drizzle-kit migrate

# Production (run from CI or Railway deploy hook)
DATABASE_URL=$PROD_DATABASE_URL npx drizzle-kit migrate
```

---

## Backup Strategy

**Automatic:** Neon provides continuous WAL-based backup with point-in-time recovery. Retention period depends on plan tier.

**Scheduled exports (belt-and-suspenders):**
- Set up a cron job (Railway cron or external service) to run a pg_dump weekly
- Store compressed dumps in an S3 bucket or Google Drive
- Retain at least 12 weeks of exports

**Recovery test:** Simulate a restore from backup at least once before go-live.

---

## Environments

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Development | `localhost:5173` | `localhost:3000` | Neon dev branch |
| Preview | Netlify preview URL | Railway staging service | Neon staging branch |
| Production | Netlify production URL | Railway production service | Neon main branch |

---

## CI/CD

- No custom CI pipeline required initially.
- Netlify and Railway both deploy automatically from `main` on push.
- Before merging to `main`: run `npm run typecheck` and `npm run lint` locally.
- Add GitHub Actions for automated type checking as the project matures.

---

## Pre-Launch Checklist

- [ ] `JWT_SECRET` is a random 64-byte hex string (not a guessable value)
- [ ] `DATABASE_URL` points to the production Neon branch
- [ ] CORS `ALLOWED_ORIGINS` only includes the production Netlify URL
- [ ] M-Pesa callback URL is reachable from Safaricom servers (Railway URL, not localhost)
- [ ] Brevo sender domain is verified
- [ ] Neon paid plan is active (for production reliability guarantees)
- [ ] At least one successful backup restore has been tested
- [ ] All `console.log` statements removed from production code
- [ ] Rate limiting is enabled on OTP endpoints
