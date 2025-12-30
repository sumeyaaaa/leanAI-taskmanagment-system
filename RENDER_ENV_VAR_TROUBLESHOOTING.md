# 🔧 Troubleshooting: Environment Variable Not Working

## The Problem
You set `VITE_BACKEND_URL` in Render, but the console still shows:
```
API Base URL: http://127.0.0.1:5000
Is Local Dev: false
```

## Why This Happens
**Vite environment variables are baked into the build at BUILD TIME**, not runtime. If you add the environment variable AFTER the build, it won't be available.

## ✅ Solution: Rebuild After Adding Environment Variable

### Step 1: Verify Environment Variable in Render
1. Go to your **Frontend Static Site** in Render Dashboard
2. Click **"Environment"** tab
3. **Verify** `VITE_BACKEND_URL` exists:
   - Key: `VITE_BACKEND_URL`
   - Value: `https://leanai-taskmanagment-system.onrender.com`
   - ⚠️ **NO trailing slash** - should be exactly: `https://leanai-taskmanagment-system.onrender.com`

### Step 2: Trigger a Rebuild
After adding/changing environment variables, you MUST rebuild:

**Option A: Manual Deploy (Recommended)**
1. In Render Dashboard → Your Static Site
2. Click **"Manual Deploy"** tab
3. Click **"Deploy latest commit"**
4. Wait for build to complete (3-7 minutes)

**Option B: Push a New Commit**
1. Make a small change (add a comment, update README)
2. Commit and push:
   ```bash
   git commit --allow-empty -m "Trigger rebuild for env vars"
   git push
   ```
3. Render will automatically rebuild

### Step 3: Verify It's Working
After rebuild completes:
1. Open your frontend URL
2. Press **F12** → **Console** tab
3. Look for:
   ```
   === API Configuration ===
   import.meta.env.VITE_BACKEND_URL: https://leanai-taskmanagment-system.onrender.com
   Final API Base URL: https://leanai-taskmanagment-system.onrender.com
   ```
4. If you still see `http://127.0.0.1:5000`, the environment variable wasn't set correctly

## 🔍 Debugging Steps

### Check 1: Environment Variable Format
- ✅ Correct: `VITE_BACKEND_URL=https://leanai-taskmanagment-system.onrender.com`
- ❌ Wrong: `VITE_BACKEND_URL = https://...` (no spaces around `=`)
- ❌ Wrong: `VITE_BACKEND_URL=https://.../` (no trailing slash)

### Check 2: Variable Name
- ✅ Must be exactly: `VITE_BACKEND_URL` (case-sensitive)
- ❌ Wrong: `VITE_backend_url` or `vite_backend_url`

### Check 3: Build Logs
1. Go to Render Dashboard → Your Static Site
2. Click **"Logs"** tab
3. Look for the build command output
4. Check if there are any errors about environment variables

### Check 4: Browser Console
After rebuild, check browser console for:
```
=== API Configuration ===
import.meta.env.VITE_BACKEND_URL: [should show your URL]
```

If it shows `undefined` or `NOT SET`, the variable wasn't available during build.

## 🚨 Common Issues

### Issue 1: "404 Not Found" on Login
**Possible causes:**
1. Backend URL is wrong (missing `/api` prefix)
2. Backend is not running
3. CORS issue

**Solution:**
- Verify backend is running: Visit `https://leanai-taskmanagment-system.onrender.com/api/health`
- Should return: `{"status": "healthy"}`
- If it doesn't, your backend isn't running correctly

### Issue 2: Environment Variable Shows in Render but Not in Code
**Solution:**
- You MUST rebuild after adding environment variables
- Environment variables are NOT available at runtime for static sites
- They must be baked into the build

### Issue 3: Still Using localhost:5000
**Solution:**
1. Double-check the variable name is exactly `VITE_BACKEND_URL`
2. Make sure there's no typo in the URL
3. Rebuild the frontend
4. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

## 📋 Quick Checklist

- [ ] Environment variable `VITE_BACKEND_URL` is set in Render
- [ ] Value is exactly: `https://leanai-taskmanagment-system.onrender.com` (no trailing slash)
- [ ] Frontend has been rebuilt after setting the variable
- [ ] Browser console shows correct API Base URL
- [ ] Backend is accessible at `https://leanai-taskmanagment-system.onrender.com/api/health`

## 🎯 Final Test

1. **Backend Health Check:**
   ```
   Visit: https://leanai-taskmanagment-system.onrender.com/api/health
   Expected: {"status": "healthy"}
   ```

2. **Frontend Console:**
   ```
   Open browser console (F12)
   Look for: "Final API Base URL: https://leanai-taskmanagment-system.onrender.com"
   ```

3. **Try Login:**
   - Should connect to backend
   - Should not show "Cannot connect to server" error

