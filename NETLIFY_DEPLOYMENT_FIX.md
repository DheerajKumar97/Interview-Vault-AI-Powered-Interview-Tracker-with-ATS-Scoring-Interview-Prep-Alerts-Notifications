# Netlify Deployment Guide

## Issue: Application Works Locally But Not on Netlify

### Root Cause
The application was hardcoded to use `localhost:3001` for backend API calls, which only exists on your local machine. Netlify deployments need to use proper environment variables.

### Solution Implemented

#### 1. Updated Files
- ✅ `src/utils/emailService.ts` - Now uses `VITE_API_URL` environment variable
- ✅ `src/utils/emailValidation.ts` - Now uses `VITE_API_URL` environment variable  
- ✅ `src/pages/Dashboard.tsx` - Now uses `VITE_API_URL` environment variable
- ✅ `.env.example` - Added `VITE_API_URL` configuration

#### 2. Configure Netlify Environment Variables

Go to your Netlify dashboard:
1. Navigate to: **Site Settings** → **Environment Variables**
2. Add the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://pjxqpsmxsyljhnjnpdyt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Backend API URL - IMPORTANT!
# Option 1: If using separate backend server (e.g., Render, Railway)
VITE_API_URL=https://your-backend-url.com

# Option 2: If using Netlify Functions only (recommended)
# Leave VITE_API_URL empty or set to your Netlify site URL
VITE_API_URL=https://your-site-name.netlify.app

# Hugging Face API
VITE_HUGGING_FACE_API_KEY=your_hugging_face_api_key_here

# SMTP Configuration (for Netlify Functions)
SMTP_USER=interviewvault2026@gmail.com
SMTP_PASS=your_smtp_app_password
```

#### 3. Deployment Options

**Option A: Use Netlify Functions Only (Recommended)**
- Your Netlify functions are already configured in `netlify/functions/`
- Set `VITE_API_URL` to your Netlify site URL
- All email APIs will use Netlify Functions

**Option B: Deploy Backend Separately**
- Deploy `server.js` to a platform like:
  - **Render**: https://render.com
  - **Railway**: https://railway.app  
  - **Heroku**: https://heroku.com
- Set `VITE_API_URL` to your backend URL

#### 4. Redeploy on Netlify

After setting environment variables:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for deployment to complete

#### 5. Verify Deployment

Check the browser console on your Netlify site:
- ❌ Before: `Failed to load resource: localhost:3001`
- ✅ After: API calls should go to your configured `VITE_API_URL`

### Local Development

For local development, create a `.env` file:

```bash
VITE_SUPABASE_URL=https://pjxqpsmxsyljhnjnpdyt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key_here
VITE_API_URL=http://localhost:3001
VITE_HUGGING_FACE_API_KEY=your_hugging_face_api_key_here
```

Then run both servers:
```bash
npm run dev      # Frontend on localhost:8080
npm run server   # Backend on localhost:3001
```

### Troubleshooting

**Issue**: Still seeing CORS errors
- **Solution**: Ensure your backend has CORS configured for your Netlify domain

**Issue**: 404 errors on API calls
- **Solution**: Verify `VITE_API_URL` is set correctly in Netlify environment variables

**Issue**: Environment variables not working
- **Solution**: Redeploy with "Clear cache and deploy site" option

### Next Steps

1. Set environment variables in Netlify
2. Redeploy the site
3. Test all functionality (signup, signin, email digest)
4. Monitor console for any remaining errors
