# Simple Deployment Guide: Vercel + Local Workers

## TL;DR
✅ **YES, deploy your Noviq project on Vercel!**

The web app works perfectly on Vercel. Only the background workers need special handling.

---

## 🎯 Recommended for Most Users

### **Deploy Web App on Vercel (5 minutes)**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your repository
   - Framework: **Next.js** (auto-detected)
   - Root Directory: **apps/web**
   - Click **Deploy**

3. **Add Environment Variables** (in Vercel Dashboard → Settings → Environment Variables)
   ```bash
   # Required for web app
   NEXT_PUBLIC_HSK_RPC_URL=https://testnet.hsk.xyz
   NEXT_PUBLIC_HSK_EXPLORER_URL=https://testnet-explorer.hsk.xyz
   NEXT_PUBLIC_HSK_CHAIN_ID=133
   
   # Required for API routes
   HSK_RPC_URL=https://testnet.hsk.xyz
   OPENROUTER_API_KEY=your_key_here
   DATABASE_URL=your_neon_database_url
   DATABASE_URL_UNPOOLED=your_neon_direct_url
   
   # Required for agent (if using serverless worker)
   AGENT_PRIVATE_KEY=0x...
   AGENT_ADDRESS=0x...
   ```

4. **Done!** Your web app is live at `https://your-project.vercel.app`

---

## 🔧 Handling Background Workers

You have **3 options**:

### **Option 1: Run Workers Locally** ⭐ Simplest for hackathons/demos

While developing or demoing, keep the workers running on your laptop:

```bash
# Terminal 1
pnpm --filter @noviq/web indexer

# Terminal 2  
pnpm --filter @noviq/web worker
```

**Pros:**
- Zero additional cost
- Immediate setup (no config needed)
- Full control and easy debugging

**Cons:**
- Computer must stay on
- Not suitable for production

**Perfect for:**
- Hackathon submissions ✅
- Development and testing ✅
- Personal projects ✅

---

### **Option 2: Deploy Workers on Railway** ⭐ Easiest production setup

[Railway](https://railway.app) offers $5/month free credit and works perfectly with Node.js workers.

**Setup (10 minutes):**

1. **Create `railway.json` in project root:**
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "pnpm install && pnpm --filter @noviq/web indexer & pnpm --filter @noviq/web worker",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app/new)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Add the same environment variables as Vercel
   - Deploy!

3. **Done!** Workers run 24/7 in Railway

**Pros:**
- Free tier available ($5 credit/month)
- Simple setup, GitHub integration
- Automatic restarts on crashes

**Cons:**
- Additional service to manage
- ~$5-10/month after free tier

---

### **Option 3: Convert to Vercel Cron Jobs** ⭐ All-in-one Vercel

Keep everything on Vercel by converting workers to scheduled functions.

**Create `apps/web/app/api/cron/indexer/route.ts`:**
```typescript
export const maxDuration = 60 // Maximum Vercel allows

export async function GET() {
  // Run indexer logic for 1 minute
  // Process latest blocks
  return Response.json({ success: true })
}
```

**Create `apps/web/app/api/cron/worker/route.ts`:**
```typescript
export const maxDuration = 60

export async function GET() {
  // Process pending agent actions
  // Run for 1 minute, then exit
  return Response.json({ success: true })
}
```

**Add `vercel.json` in root:**
```json
{
  "crons": [
    {
      "path": "/api/cron/indexer",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/worker", 
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**Pros:**
- Everything on Vercel (single platform)
- No additional services
- Automatic scaling

**Cons:**
- 60-second timeout limit
- Runs periodically (not continuously)
- May miss real-time events

---

## 📊 Comparison Table

| Deployment | Web App | Workers | Cost | Setup Time | Best For |
|------------|---------|---------|------|------------|----------|
| **Vercel + Local** | Vercel | Your laptop | Free | 5 min | Demos, MVPs |
| **Vercel + Railway** | Vercel | Railway | ~$5/mo | 15 min | Production |
| **Vercel + Render** | Vercel | Render | ~$7/mo | 15 min | Production |
| **All Vercel (Cron)** | Vercel | Vercel Cron | Free | 30 min | Low traffic |

---

## 🎬 Quick Start: Vercel + Local Workers

**Total time: 5 minutes**

1. **Deploy to Vercel** (as shown above)
2. **Run workers locally:**
   ```bash
   pnpm --filter @noviq/web indexer &
   pnpm --filter @noviq/web worker
   ```
3. **Access your app:** `https://your-project.vercel.app`

**That's it!** You're running a production web app with local workers.

---

## ❓ FAQ

### Q: Will my demo break if I close my laptop?
**A:** Only if you're using local workers (Option 1). The web app on Vercel stays up 24/7. If you need 100% uptime, use Railway/Render (Option 2).

### Q: Which option should I use for the hackathon?
**A:** Option 1 (Vercel + local workers). It's the fastest to set up and perfect for demos. Judges will love the live web app!

### Q: Can I upgrade later?
**A:** Yes! Start with local workers, then move to Railway when you need production hosting. Zero code changes needed.

### Q: Why can't workers run on Vercel?
**A:** Vercel uses serverless functions that timeout after 60 seconds. Workers need to run continuously (listening for blockchain events). Railway/Render provide traditional "always-on" hosting.

### Q: Is the database on Vercel?
**A:** No, use [Neon](https://neon.tech) (recommended) or [Supabase](https://supabase.com) for PostgreSQL. Both have generous free tiers and work perfectly with Vercel.

---

## 🚀 Next Steps

1. ✅ **Now:** Deploy web app to Vercel (5 minutes)
2. ✅ **For demo:** Run workers locally (perfectly fine!)
3. ✅ **For production:** Move workers to Railway when ready

**Your Noviq app is production-ready on Vercel!** 🎉

---

<div align="center">

**Need help?** See [VERCEL-DEPLOYMENT.md](./VERCEL-DEPLOYMENT.md) for detailed troubleshooting.

</div>
