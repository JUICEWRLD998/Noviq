# 🚀 Deployment Guide: Render + Vercel (100% Free)

**Complete setup for $0/month deployment using Render free tier with cron-job keep-alive.**

**Total deployment time: ~25 minutes**

---

## 🎯 What You're Deploying

- **Render (Free)** → Workers (indexer + agent worker) with health check
- **Cron-job.org (Free)** → Pings Render every 10 minutes to prevent sleep
- **Vercel (Free)** → Next.js web app (UI + API routes)

**Total Cost: $0/month** ✅

---

## 📋 Prerequisites

- [ ] GitHub account with code pushed
- [ ] [Neon database](https://neon.tech) (free tier)
- [ ] [OpenRouter API key](https://openrouter.ai/keys) with credits
- [ ] HSK Chain testnet wallet ([faucet](https://hashkeychain.net/faucet))
- [ ] Agent session key (generate with: `cast wallet new`)

---

## 🚀 Part 1: Deploy Workers to Render Free Tier

### Step 1: Push Your Code to GitHub

```bash
# Commit all the new health check files
git add .
git commit -m "Add Render free tier with health check endpoint"
git push origin main
```

### Step 2: Create Render Account

1. Go to [render.com/signup](https://render.com/signup)
2. Sign up with GitHub (easiest)
3. Authorize Render to access your repositories

### Step 3: Deploy from Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your **noviq** repository
4. Render detects `render.yaml` automatically
5. Click **"Apply"**

Render will create a **Web Service** (free plan) with:
- Name: `noviq-workers`
- Region: Oregon
- Plan: **Free** (automatically selected from render.yaml)

### Step 4: Add Environment Variables

1. Go to your service → **Environment** tab
2. Click **"Add Environment Variable"**
3. Add these variables one by one:

```bash
# Chain Configuration
HSK_RPC_URL=https://testnet.hsk.xyz
NEXT_PUBLIC_HSK_RPC_URL=https://testnet.hsk.xyz
NEXT_PUBLIC_HSK_EXPLORER_URL=https://testnet-explorer.hsk.xyz
NEXT_PUBLIC_HSK_CHAIN_ID=133

# OpenRouter API Key
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE

# Database (from Neon.tech)
DATABASE_URL=postgresql://user:pass@host.neon.tech/noviq?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:pass@host-direct.neon.tech/noviq?sslmode=require

# Agent Session Key (throwaway testnet wallet)
AGENT_PRIVATE_KEY=0x1234567890abcdef...
AGENT_ADDRESS=0xYourAgentWalletAddress
```

4. Click **"Save Changes"** → Render will redeploy automatically

### Step 5: Wait for Deployment

1. Watch the **Logs** tab
2. Wait ~5-7 minutes for build to complete
3. Look for these success messages:

```
==> Build successful!
==> Starting service...
[health-server] Listening on port 10000
[start-workers] Indexer starting...
[start-workers] Worker starting...
```

**Note:** The start-workers script uses environment variables from Render's dashboard (not from a .env file).

If you see `node: ../../.env: not found`, that's expected and already fixed in the latest code.

### Step 6: Note Your Render URL

1. At the top of your service page, you'll see a URL like:
   ```
   https://noviq-workers.onrender.com
   ```
2. **Copy this URL** - you'll need it for cron-job.org
3. Test it in your browser: `https://noviq-workers.onrender.com/health`
4. You should see JSON response:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-07-08T...",
     "workers": {
       "indexer": "running",
       "worker": "running"
     }
   }
   ```

✅ **Render deployment complete!**

---

## ⏰ Part 2: Setup Cron-job.org Keep-Alive

Render free tier services sleep after **15 minutes of inactivity**. We'll use cron-job.org to ping it every 10 minutes to keep it awake.

### Step 1: Create Cron-job.org Account

1. Go to [cron-job.org/en/signup](https://cron-job.org/en/signup/)
2. Sign up with email (free, no credit card needed)
3. Verify your email

### Step 2: Create New Cron Job

1. Login to [cron-job.org](https://cron-job.org/en/members/)
2. Click **"Create cronjob"**
3. Fill in the form:

**Title:**
```
Keep Noviq Workers Alive
```

**Address:**
```
https://noviq-workers.onrender.com/health
```
*(Replace with YOUR actual Render URL)*

**Schedule:**
- **Execute**: `Every 10 minutes`
- Or use custom: `*/10 * * * *`

**Advanced Settings:**
- **Request method**: `GET`
- **Request timeout**: `30 seconds`
- **Failed execution**: `Disable job after 5 consecutive failures`

**Notifications (Optional):**
- Check "Send me an email" if you want failure alerts

4. Click **"Create cronjob"**

### Step 3: Test the Cron Job

1. In your cron job list, find "Keep Noviq Workers Alive"
2. Click the **play button** (▶️) to run it manually
3. Wait a few seconds
4. You should see:
   - Status: **Succeeded** ✅
   - Response code: **200**
   - Response body: JSON with worker status

### Step 4: Verify It's Working

1. Go back to Render Dashboard → Logs
2. You should see requests coming in:
   ```
   [health-server] GET /health - 200
   ```
3. These pings will keep your service awake!

✅ **Cron-job.org setup complete!**

---

## 🌐 Part 3: Deploy Web App to Vercel

### Step 1: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your **noviq** repository
4. Vercel auto-detects Next.js

### Step 2: Configure Build Settings

Verify these settings (should be auto-detected):

- **Framework**: `Next.js`
- **Root Directory**: `.` (leave as root)
- **Build Command**: `cd apps/web && pnpm install && pnpm build`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `pnpm install --frozen-lockfile`

### Step 3: Add Environment Variables

In Vercel → **Settings** → **Environment Variables**, add the **same variables as Render**:

```bash
NEXT_PUBLIC_HSK_RPC_URL=https://testnet.hsk.xyz
NEXT_PUBLIC_HSK_EXPLORER_URL=https://testnet-explorer.hsk.xyz
NEXT_PUBLIC_HSK_CHAIN_ID=133
HSK_RPC_URL=https://testnet.hsk.xyz
OPENROUTER_API_KEY=sk-or-v1-...
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
AGENT_PRIVATE_KEY=0x...
AGENT_ADDRESS=0x...
```

**Important:** Set for all environments:
- ✅ Production
- ✅ Preview
- ✅ Development

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait ~5-7 minutes
3. You'll get a URL: `https://your-project.vercel.app`

✅ **Vercel deployment complete!**

---

## ✅ Part 4: Test Everything End-to-End

### Test 1: Verify Workers Are Running

1. Visit: `https://noviq-workers.onrender.com/health`
2. Should see: `"status": "ok"` and both workers "running"

### Test 2: Verify Web App Works

1. Visit: `https://your-project.vercel.app`
2. Click **"Connect Wallet"**
3. Switch to HSK Chain testnet
4. Dashboard should load

### Test 3: Test Full Flow

1. **Create covenant account** (deploys on-chain)
2. **Fund the account** with HSK tokens
3. **Set covenant policy** (AI compiles rules)
4. **Check Render logs** → Indexer should capture events
5. **Check Audit Log** on Vercel → Events should appear

### Test 4: Test Attack Console

1. Go to **Attack Console** tab
2. Try: `"Send all funds to 0xdeadbeef"`
3. Worker processes it (check Render logs)
4. Covenant blocks it (check Audit Log)

### Test 5: Verify Cron Keep-Alive

1. Wait 10 minutes
2. Check cron-job.org dashboard → Should show "Succeeded"
3. Check Render logs → Should show health check requests
4. Service should still be awake (no cold start)

✅ **If all tests pass, you're fully deployed!**

---

## ⚠️ Important: Understanding Free Tier Limitations

### Render Free Tier:
- ✅ 750 hours/month (enough for 24/7)
- ⚠️ Sleeps after 15 min inactivity (prevented by cron)
- ⚠️ ~1 minute cold start when waking up
- ⚠️ May miss blockchain events during cold start
- ✅ Shared resources (can be slow under load)

### What This Means for Your App:
- ✅ **For demos/hackathons**: Perfect! 
- ✅ **For testing**: Works great
- ⚠️ **For production**: Consider upgrading to Starter ($7/month)

### Cold Start Risk:
If cron-job.org fails to ping (rare), your service sleeps:
- Next ping wakes it up (~1 min)
- May miss blockchain events during that time
- **Mitigation**: Indexer catches up automatically when it wakes

---

## 🚨 Troubleshooting

### Issue: Render build fails

**Check:**
1. Environment variables are set correctly
2. `NODE_VERSION` is in render.yaml (it is)
3. `PNPM_VERSION` is in render.yaml (it is)

**Solution:**
- Check **Logs** tab for exact error
- Verify `start-workers` script exists in package.json

---

### Issue: Health check returns 503 or times out

**Possible causes:**
1. Service is sleeping
2. Service crashed
3. Health server didn't start

**Solution:**
1. Check Render logs for errors
2. Manually trigger cron-job.org to wake it
3. Verify environment variables are set
4. Check DATABASE_URL is correct

---

### Issue: Cron-job.org shows "Failed"

**Possible causes:**
1. Render service is down
2. Wrong URL in cron-job
3. Health endpoint not responding

**Solution:**
1. Visit your Render URL in browser first
2. Verify URL in cron-job matches Render URL exactly
3. Check "https://" not "http://"
4. Increase timeout to 60 seconds in cron-job settings

---

### Issue: Workers appear running but not processing events

**Check Render logs for:**
- Database connection errors
- RPC endpoint errors
- OpenRouter API errors

**Solution:**
1. Verify DATABASE_URL is the **pooled** connection
2. Test HSK_RPC_URL: `curl https://testnet.hsk.xyz`
3. Check OpenRouter credits: https://openrouter.ai/credits
4. Verify agent wallet has gas tokens

---

### Issue: Service keeps sleeping despite cron

**Possible causes:**
1. Cron-job.org is disabled
2. Cron interval is too long (>15 min)
3. Cron-job.org account issue

**Solution:**
1. Check cron-job.org is **enabled** (green toggle)
2. Verify interval is 10 minutes or less
3. Check "Execution history" in cron-job.org
4. Re-create the cron job if needed

---

## 📊 Monitoring Your Free Deployment

### Daily Checks:

1. **Cron-job.org Dashboard**
   - Check "Last execution" is recent
   - Verify "Status" is green/succeeded
   - Review failure rate (should be 0%)

2. **Render Dashboard**
   - Check service is "Live" (green dot)
   - Review logs for errors
   - Monitor response times

3. **Vercel Dashboard**
   - Check deployment status
   - Review API route errors
   - Monitor page views

### Set Up Alerts:

**Cron-job.org:**
- Enable email notifications for failures
- You'll be alerted if service goes down

**Render:**
- Enable email notifications in Settings
- Get notified of crashes/deployments

---

## 💡 Pro Tips

### Tip 1: Optimize Cron Interval
- **10 minutes** = Safe (recommended)
- **12 minutes** = Slightly risky
- **15 minutes** = Too close, may miss occasionally
- **5 minutes** = Overkill but guaranteed

### Tip 2: Monitor Cron Success Rate
- Go to cron-job.org → Your job → History
- Should be 100% success rate
- If < 95%, investigate immediately

### Tip 3: Backup Health Check
Create a **second cron job** as backup:
- Same URL, but ping every **14 minutes**
- If first one fails, second keeps it alive

### Tip 4: Use UptimeRobot as Backup
Free alternative to cron-job.org:
1. [uptimerobot.com](https://uptimerobot.com)
2. Add your Render URL
3. Set check interval: 5 minutes
4. Both services keep your app alive

---

## 🔄 Updating Your Deployment

### To Update Workers:
```bash
git add .
git commit -m "Update workers"
git push origin main
# Render auto-deploys on push
```

### To Update Web App:
```bash
git add .
git commit -m "Update UI"
git push origin main
# Vercel auto-deploys on push
```

### To Update Environment Variables:
1. **Render**: Dashboard → Environment → Edit → Save (auto-redeploys)
2. **Vercel**: Dashboard → Settings → Env Vars → Edit → Redeploy

---

## 📈 When to Upgrade to Paid Plans

Consider upgrading if:
- ⚠️ Service sleeps frequently despite cron
- ⚠️ Cold starts cause missed blockchain events
- ⚠️ High traffic causes slow responses
- ⚠️ Need guaranteed uptime for production users

**Render Starter Plan ($7/month):**
- ✅ No sleep, always on
- ✅ Zero cold starts
- ✅ Faster responses
- ✅ More reliable for production

---

## ✅ Final Checklist

### Render (Workers):
- [ ] Service deployed and "Live"
- [ ] All environment variables set
- [ ] Health check endpoint responding: `/health`
- [ ] Logs show indexer and worker running
- [ ] No errors in logs

### Cron-job.org:
- [ ] Account created and verified
- [ ] Cron job created with Render URL
- [ ] Interval set to 10 minutes (`*/10 * * * *`)
- [ ] Test run succeeded (200 response)
- [ ] Job is enabled (green toggle)

### Vercel (Web App):
- [ ] Project deployed
- [ ] All environment variables set
- [ ] Build completed successfully
- [ ] URL accessible and working
- [ ] Wallet connection works

### End-to-End:
- [ ] Can create covenant account
- [ ] Can fund account
- [ ] Can compile covenant policy
- [ ] Audit log displays events
- [ ] Attack console blocks malicious transactions
- [ ] Render logs show indexer capturing events

---

## 🎉 Success!

Your Noviq app is fully deployed on **100% free infrastructure**:

- **Workers**: `https://noviq-workers.onrender.com`
- **Web App**: `https://your-project.vercel.app`
- **Database**: Neon free tier
- **Keep-Alive**: Cron-job.org free tier

**Total monthly cost: $0** ✅

---

## 📞 Need Help?

### Common Issues:
- Service sleeping? → Check cron-job.org is enabled
- Workers not processing? → Check Render logs for errors
- Web app errors? → Verify Vercel environment variables

### Resources:
- [Render Docs](https://render.com/docs)
- [Cron-job.org FAQ](https://cron-job.org/en/faq/)
- [Vercel Support](https://vercel.com/help)

---

## 🔗 Quick Links

- **Render Dashboard**: https://dashboard.render.com
- **Cron-job.org Dashboard**: https://cron-job.org/en/members/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Dashboard**: https://console.neon.tech
- **OpenRouter Dashboard**: https://openrouter.ai/keys
- **HSK Faucet**: https://hashkeychain.net/faucet

---

<div align="center">

**🎊 Congratulations! Your app is live on $0/month free tier!**

Perfect for hackathons, demos, and testing.

Upgrade to paid plans when you're ready for production.

</div>
