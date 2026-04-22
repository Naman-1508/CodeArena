# CodeArena — Free Deployment Guide (Zero Cost)

## 1. Architecture Overview (What You're Actually Running)

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Frontend   │────▶│     Backend      │────▶│  Execution Service  │
│  React/Vite  │     │ Express+Socket.io│     │  BullMQ Worker      │
│              │     │ BullMQ Producer  │     │  Spawns Docker Containers│
└──────────────┘     └──────────────────┘     └─────────────────────┘
                              │                          │
                              ▼                          ▼
                        ┌──────────┐             ┌──────────────┐
                        │  Redis   │             │   Docker     │
                        │ (Queue + │             │ node:alpine  │
                        │ Socket   │             │ python:alpine│
                        │ Adapter) │             │ java:alpine  │
                        └──────────┘             │ cpp:alpine   │
                              │                  └──────────────┘
                              ▼
                        ┌──────────┐
                        │ MongoDB  │
                        │ (Atlas)  │
                        └──────────┘
```

---

## 2. Is Docker Genuinely Needed?

### Short Answer: **Split — one use is optional, one is critical.**

Your project uses Docker in **two completely different ways**:

### Use #1 — `docker-compose.yml` (Running Redis + MongoDB locally)
```yaml
# This only spins up Redis & MongoDB on your local machine
services:
  redis:    # Queue + Socket.io adapter
  mongodb:  # Database
```
**➡ NOT needed in production.** You replace both with free cloud services:
- MongoDB → Already on **MongoDB Atlas** (free tier, already configured in your `.env`)
- Redis → Replace with **Upstash Redis** (free, cloud-hosted)

### Use #2 — `execution-service/src/docker.js` (Running User Code Safely)
```js
// This runs INSIDE your execution-service
docker run --rm --network none --cpus="0.5" --memory="256m" \
  -v "/tmp/job-xxx:/app" -w /app node:18-alpine timeout 10s node run_tests.js
```
**➡ ABSOLUTELY CRITICAL and cannot be easily removed.**

Here's why Docker is non-negotiable for this:

| Risk Without Docker | What Could Happen |
|---|---|
| `while(true){}` infinite loop | Crashes your server process permanently |
| `fs.unlinkSync('/')` | Deletes your server files |
| `require('child_process').exec('rm -rf /')` | Destroys entire server |
| Memory bomb (`new Array(999999999)`) | OOM kills everything |
| Network access | User code could hit internal APIs |

Docker provides:
- **CPU limits** (`--cpus="0.5"`)
- **Memory limits** (`--memory="256m"`)
- **Network isolation** (`--network none`)
- **Filesystem isolation** (volume mount only, no host access)
- **Timeout enforcement** (`timeout 10s`)

Without it, every code submission is a potential exploit. **Keep Docker for execution.**

---

## 3. Free Hosting Plan (100% Zero Cost)

| Service | Platform | Free Tier Details |
|---|---|---|
| **Frontend** | Vercel | Unlimited deployments, 100GB bandwidth/mo |
| **Backend** | Render | 750hrs/mo (sleeps after 15min idle) |
| **Redis** | Upstash | 10,000 commands/day, 256MB |
| **MongoDB** | Atlas | Already set up ✅ 512MB storage |
| **Execution Service** | **Fly.io** | 3 shared VMs free + **Docker support** ✅ |

> [!IMPORTANT]
> The execution-service **MUST** run on a platform that allows Docker-inside-Docker (DinD).
> Render, Vercel, Netlify, Railway's free tier — **none of these support it**.
> **Fly.io is the only major free platform that supports Docker natively.**

---

## 4. Step-by-Step Deployment

### Step 1: Set Up Upstash Redis (5 minutes)

1. Go to [upstash.com](https://upstash.com) → Sign up free
2. Create a Redis database → Select **Global** → Free tier
3. Copy the **Redis URL** (format: `rediss://default:xxx@xxx.upstash.io:6379`)
4. You'll use this as `REDIS_URL` in both Backend and Execution Service

### Step 2: Deploy Backend to Render (10 minutes)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo → Select `backend/` as root directory
4. Settings:
   ```
   Build Command:  npm install
   Start Command:  npm start
   Runtime:        Node
   ```
5. Add Environment Variables:
   ```
   MONGO_URI=mongodb+srv://namanjain01508:...  (your existing Atlas URI)
   REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
   PORT=5000
   NODE_ENV=production
   CLIENT_URL=https://your-app.vercel.app   ← set after step 4
   JWT_SECRET=supersecretcodearenakey2026
   JWT_EXPIRE=30d
   GEMINI_API_KEY=AIzaSyDoPJKejM6z_FWuVwpkDohq9vXX2nEeZEE
   EMAIL_USER=codearena15@gmail.com
   EMAIL_PASS=ovht dwht yven tiat
   ```
6. Deploy → Note the URL: `https://codearena-backend.onrender.com`

> [!WARNING]
> Render free tier **sleeps after 15 minutes** of inactivity. First request after sleep takes ~30s to cold start. 
> To prevent this, use [cron-job.org](https://cron-job.org) to ping your backend URL every 10 minutes for free.

### Step 3: Deploy Frontend to Vercel (5 minutes)

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework: **Vite**
4. Add Environment Variable:
   ```
   VITE_API_URL=https://codearena-backend.onrender.com
   VITE_SOCKET_URL=https://codearena-backend.onrender.com
   ```
5. Deploy → You get: `https://codearena.vercel.app`
6. **Go back to Render** and update `CLIENT_URL` to `https://codearena.vercel.app`

> [!NOTE]
> After deploying frontend, check your frontend code for any hardcoded `localhost:5000` and replace with `import.meta.env.VITE_API_URL`.

### Step 4: Deploy Execution Service to Fly.io (20 minutes)

This is the critical one — Fly.io is the only free platform supporting Docker-in-Docker.

**Install Fly CLI:**
```bash
# On Windows (PowerShell as Admin)
iwr https://fly.io/install.ps1 -useb | iex
```

**Create a `Dockerfile`** in `execution-service/`:
```dockerfile
FROM node:18-alpine

# Install Docker CLI inside container (for Docker-in-Docker)
RUN apk add --no-cache docker-cli

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

# Create tmp directory for code execution
RUN mkdir -p /app/tmp

CMD ["node", "src/worker.js"]
```

**Create `fly.toml`** in `execution-service/`:
```toml
app = "codearena-executor"
primary_region = "sin"  # Singapore — closest to India

[build]

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 3001
  protocol = "tcp"

[mounts]
  source = "docker_socket"
  destination = "/var/run/docker.sock"
```

**Deploy:**
```bash
cd execution-service
fly auth login
fly launch --name codearena-executor --region sin --no-deploy
fly secrets set REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"
fly secrets set GEMINI_API_KEY="AIzaSyDoPJKejM6z_FWuVwpkDohq9vXX2nEeZEE"
fly deploy
```

> [!CAUTION]
> Fly.io free tier gives 3 shared VMs (256MB RAM each). Each Docker execution uses ~256MB.
> If you exceed the free tier, you'll be charged. Monitor usage in the Fly.io dashboard.
> Consider adding a **job rate limiter** to avoid abuse.

---

## 5. Required Code Changes Before Deploying

### 5.1 — Backend: Add REDIS_URL support (check if already done)
Your `backend` needs to use `REDIS_URL` env var. Check `src/server.js` or wherever Redis is initialized:
```js
// backend/src/config/redis.js (or wherever Redis is configured)
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : new Redis({ host: '127.0.0.1', port: 6379 });
```
Your execution-service already does this correctly at line 6-8 of `worker.js` ✅

### 5.2 — Frontend: Replace all hardcoded localhost URLs
Search for any `localhost:5000` in your frontend:
```bash
# Run this in your frontend/src directory
grep -r "localhost" frontend/src/
```
Replace with:
```js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

### 5.3 — Backend CORS: Allow Vercel domain
```js
// In backend CORS config
cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:5173'],
  credentials: true
})
```

---

## 6. Alternative If Fly.io Doesn't Work

If you hit issues with Docker-in-Docker on Fly.io, here are alternatives:

### Option A: Oracle Cloud Always Free (Best Long-Term)
- **4 ARM CPUs + 24GB RAM** — permanently free forever
- Full Ubuntu VM — install Docker normally
- No sleep, no limits
- Requires: Credit card for verification (not charged)
- Guide: [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)

### Option B: Disable Docker, Use AI-Only Execution
Your `worker.js` already has an AI fallback at lines 38-42:
```js
if (!testCases || testCases.length === 0) {
  // Falls back to Gemini AI evaluation
  return await evaluateCodeWithAI(...);
}
```
You could extend this to **always use AI** when Docker is unavailable, though it's less accurate.

### Option C: Judge0 API (Free tier)
Replace your Docker execution with [Judge0 CE](https://judge0.com/) — a free code execution API:
- 100 submissions/day free
- Handles all languages
- No Docker needed on your end
- They handle the sandboxing

---

## 7. Summary: What Costs What

| Component | Platform | Cost |
|---|---|---|
| Frontend hosting | Vercel | **FREE** |
| Backend hosting | Render | **FREE** (with cold starts) |
| Database | MongoDB Atlas | **FREE** (512MB) |
| Redis/Queue | Upstash | **FREE** (10K req/day) |
| Code Execution | Fly.io | **FREE** (3 VMs) |
| Domain | Your own or `.vercel.app` | **FREE** |
| **Total** | | **$0/month** |

---

## 8. Production Checklist

- [ ] Remove sensitive keys from `.env` and set them as platform secrets
- [ ] Enable HTTPS everywhere (all platforms do this by default)
- [ ] Add rate limiting to execution endpoint (prevent abuse)
- [ ] Set up cron-job.org to ping Render backend every 10min
- [ ] Test Socket.io works with your Render backend (WebSocket support is included in Render free tier)
- [ ] Verify Redis URL is `rediss://` (with SSL) for Upstash, not `redis://`
