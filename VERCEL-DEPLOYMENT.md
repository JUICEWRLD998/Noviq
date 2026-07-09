# Vercel Deployment Guide for Noviq

## ✅ Deployment Readiness: YES (with considerations)

Noviq is **compatible with Vercel** and can be deployed successfully. However, due to the nature of the application (blockchain integration, AI workers, and database requirements), proper configuration is essential.

---

## 📋 Pre-Deployment Checklist

### 1. **Database Setup (Required)**
- [ ] Provision a **PostgreSQL database** (recommended: [Neon](https://neon.tech) or [Supabase](https://supabase.com))
- [ ] Obtain both pooled and direct connection strings
- [ ] Run database migrations using `pnpm db:push` from the `packages/db` directory

### 2. **Environment Variables (Required)**
Configure the following in Vercel's project settings:

#### **Public Variables** (Browser-exposed)
```bash
NEXT_PUBLIC_HSK_RPC_URL=https://testnet.hsk.xyz
NEXT_PUBLIC_HSK_EXPLORER_URL=https://testnet-explorer.hsk.xyz
NEXT_PUBLIC_HSK_CHAIN_ID=133
```

#### **Server-Only Variables** (Secrets)
```bash
# Blockchain RPC
HSK_RPC_URL=https://testnet.hsk.xyz

# OpenRouter API Key (for Gemini AI)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Database (Neon/Supabase)
DATABASE_URL=your_pooled_database_url_here
DATABASE_URL_UNPOOLED=your_direct_database_url_here

# Agent Session Key (testnet only - generate with: cast wallet new)
AGENT_PRIVATE_KEY=0x...
AGENT_ADDRESS=0x...
```

> ⚠️ **Security Note**: The `AGENT_PRIVATE_KEY` should be a throwaway testnet key funded with minimal HSK tokens for gas. NEVER use a mainnet key or owner's key.

### 3. **Build Configuration**

The project uses:
- **Turborepo** monorepo with `pnpm` workspaces
- **Next.js 16** (App Router)
- **TypeScript** packages that require transpilation

Vercel will automatically detect Next.js and use the correct build command from `package.json`:
```json
{
  "scripts": {
    "build": "turbo run build"
  }
}
```

---

## 🔧 Vercel Project Configuration

### **Framework Preset**
- Framework: `Next.js`
- Root Directory: `apps/web`
- Build Command: `cd ../.. && pnpm install && pnpm build --filter=@noviq/web`
- Install Command: `pnpm install`
- Output Directory: `apps/web/.next`

### **Node.js Version**
- Set Node.js version to **20.x** or higher (specified in root `package.json`)

### **Environment Variables**
Add all variables from the checklist above in:
- **Vercel Dashboard** → Your Project → Settings → Environment Variables

---

## ⚠️ Important Considerations

### **1. Background Workers**
The application includes background processes that **cannot run on Vercel's serverless platform**:
- `pnpm worker` - Agent worker process
- `pnpm indexer` - Blockchain event indexer

**Solutions:**
- **Option A (Recommended)**: Deploy workers separately on a long-running platform:
  - [Railway](https://railway.app)
  - [Render](https://render.com)
  - [Fly.io](https://fly.io)
  - Traditional VPS (DigitalOcean, AWS EC2)

- **Option B**: Convert to serverless cron jobs using Vercel Cron:
  ```javascript
  // app/api/cron/worker/route.ts
  export async function GET(request: Request) {
    // Run worker logic once
    // Trigger via Vercel Cron (max 10 seconds execution)
  }
  ```

### **2. Foundry/Contract Deployment**
Contracts are pre-deployed to HSK Chain testnet. If you need to deploy contracts:
- Foundry (`forge`, `cast`) is **not available** on Vercel
- Deploy contracts separately from a local machine or CI/CD pipeline
- Update contract addresses in the codebase

### **3. Database Migrations**
- Run migrations **before** deployment: `pnpm db:push` from `packages/db`
- Use `DATABASE_URL_UNPOOLED` for migrations (direct connection)
- Vercel functions will use `DATABASE_URL` (pooled connection)

### **4. Monorepo Build**
The monorepo structure is supported by Vercel, but ensure:
- Install from root: `pnpm install` (not `apps/web`)
- Turborepo caching is enabled (automatically detected)
- All workspace packages transpile correctly (`transpilePackages` in `next.config.ts`)

---

## 🚀 Deployment Steps

### **Step 1: Connect Repository**
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Vercel Dashboard](https://vercel.com/new)
3. Import your repository
4. Select the root directory (not `apps/web` - Vercel will detect it)

### **Step 2: Configure Project**
1. Framework Preset: `Next.js`
2. Root Directory: Leave as `.` (root)
3. Build & Development Settings:
   - Build Command: `cd apps/web && pnpm build`
   - Output Directory: `apps/web/.next`
   - Install Command: `pnpm install`

### **Step 3: Add Environment Variables**
1. Go to Settings → Environment Variables
2. Add all variables from the checklist
3. Set them for **Production**, **Preview**, and **Development** environments

### **Step 4: Deploy**
1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployment URL

### **Step 5: Verify Deployment**
- [ ] Homepage loads correctly
- [ ] Connect wallet functionality works
- [ ] Can view demo accounts
- [ ] Covenant editor compiles policies (tests OpenRouter API)
- [ ] Audit log displays correctly (tests database connection)

---

## 🐛 Troubleshooting

### **Build fails with "workspace not found"**
- Ensure `pnpm install` runs from the root
- Check that all `workspace:*` dependencies are present

### **Environment variables not working**
- Verify variables are set for the correct environment (Production/Preview)
- Public variables must start with `NEXT_PUBLIC_`
- Redeploy after adding/changing variables

### **Database connection fails**
- Check that `DATABASE_URL` is the **pooled** connection string
- Verify database is accessible from Vercel's region
- Test connection string locally first

### **AI features not working**
- Verify `OPENROUTER_API_KEY` is set correctly
- Check OpenRouter account has credits
- Review Vercel function logs for API errors

### **"Agent execute failed"**
- Ensure `AGENT_PRIVATE_KEY` and `AGENT_ADDRESS` are set
- Verify agent wallet has HSK tokens for gas
- Check HSK Chain testnet RPC is accessible

---

## 📊 Recommended Architecture

For production-grade deployment:

```
┌─────────────────────────────────────────────────┐
│                    Vercel                       │
│  ┌─────────────────────────────────────────┐   │
│  │  Next.js App (apps/web)                 │   │
│  │  - UI + API Routes                      │   │
│  │  - Serverless Functions                 │   │
│  └─────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────┘
               │
               ├─────────────────────────────────────┐
               │                                     │
        ┌──────▼───────┐                   ┌────────▼─────────┐
        │   Neon DB    │                   │  Railway/Render  │
        │  (Postgres)  │                   │  - Worker        │
        └──────────────┘                   │  - Indexer       │
                                           └──────────────────┘
                                                    │
                                           ┌────────▼─────────┐
                                           │  HSK Chain RPC   │
                                           │  (testnet)       │
                                           └──────────────────┘
```

---

## 💡 Alternative: Full Serverless Approach

If you prefer to keep everything on Vercel:

1. **Convert worker to API route with cron**:
   ```typescript
   // app/api/cron/worker/route.ts
   export const maxDuration = 60; // seconds
   
   export async function GET() {
     // Run one iteration of worker logic
     // Return status
   }
   ```
   Configure in `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/cron/worker",
       "schedule": "*/5 * * * *"
     }]
   }
   ```

2. **Convert indexer to edge function**:
   - Trigger from frontend when needed
   - Or use Vercel Cron for periodic indexing

---

## ✅ Conclusion

**Noviq is Vercel-compatible** with proper configuration. The main considerations are:

1. ✅ **Next.js app** deploys perfectly
2. ✅ **Monorepo** structure is supported
3. ✅ **Environment variables** must be configured
4. ⚠️ **Background workers** need separate deployment or conversion to cron jobs
5. ✅ **Database** works with Neon/Supabase pooled connections

For a hackathon demo or MVP, deploying the web app to Vercel while running workers locally is perfectly acceptable. For production, use the recommended architecture with separate worker deployment.

---

## 📞 Additional Resources

- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Neon Database](https://neon.tech/docs/introduction)
