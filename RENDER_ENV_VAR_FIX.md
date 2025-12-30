# 🔧 Fix: Frontend Not Connecting to Backend

## The Problem
The frontend is showing "Cannot connect to server. Make sure backend is running on port 5000" even though:
- Backend is deployed at: `https://leanai-taskmanagment-system.onrender.com`
- Environment variable is set: `REACT_APP_BACKEND_URL=https://leanai-taskmanagment-system.onrender.com`

## The Issue
Vite (the build tool) uses `import.meta.env` instead of `process.env`, and requires `VITE_` prefix for environment variables.

## ✅ Solution: Update Environment Variable in Render

### Option 1: Add VITE_ Prefix (Recommended)
1. Go to your **Frontend Static Site** in Render Dashboard
2. Click **"Environment"** tab
3. **Add a new variable:**
   - Key: `VITE_BACKEND_URL`
   - Value: `https://leanai-taskmanagment-system.onrender.com`
4. **Keep** `REACT_APP_BACKEND_URL` as well (for compatibility)
5. Click **"Save Changes"**
6. **Redeploy** the frontend

### Option 2: Use Only VITE_ Prefix
1. Go to your **Frontend Static Site** in Render Dashboard
2. Click **"Environment"** tab
3. **Change** the existing variable:
   - Old Key: `REACT_APP_BACKEND_URL`
   - New Key: `VITE_BACKEND_URL`
   - Value: `https://leanai-taskmanagment-system.onrender.com`
4. Click **"Save Changes"**
5. **Redeploy** the frontend

## 🔍 Verify It's Working

After redeploying, check the browser console:
1. Open your frontend URL
2. Press F12 → Console tab
3. Look for: `API Base URL: https://leanai-taskmanagment-system.onrender.com`
4. If you see `http://127.0.0.1:5000`, the environment variable isn't being read correctly

## 📋 Current Environment Variables Needed

**Frontend (Static Site):**
- `VITE_BACKEND_URL` = `https://leanai-taskmanagment-system.onrender.com`
- OR `REACT_APP_BACKEND_URL` = `https://leanai-taskmanagment-system.onrender.com` (both work now)

**Backend (Web Service):**
- `FLASK_SECRET_KEY` = (your secret key)
- `SUPERADMIN_EMAIL` = `admin@leanchem.com`
- `SUPERADMIN_PASSWORD` = (your password)
- `SUPABASE_URL` = (your Supabase URL)
- `SUPABASE_SERVICE_KEY` = (your Supabase service key)
- `PORT` = `10000`
- `FRONTEND_ORIGIN` = `https://your-frontend-url.onrender.com`

## ⚠️ Important Notes

1. **Environment variables are baked into the build** - you must rebuild after changing them
2. **Vite requires `VITE_` prefix** - variables without this prefix won't be exposed to the client
3. **The code now supports both** `VITE_BACKEND_URL` and `REACT_APP_BACKEND_URL` for compatibility

