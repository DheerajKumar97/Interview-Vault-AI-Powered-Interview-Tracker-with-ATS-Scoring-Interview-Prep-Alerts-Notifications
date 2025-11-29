# ⚙️ Email Integration Setup - Sign In Email Fix

## Problem: Not Receiving Sign In Emails

The email service was created but the `signIn` function in AuthContext wasn't calling it. This guide fixes that issue.

---

## 📋 What Was Fixed

1. ✅ Created frontend email service utility (`src/utils/emailService.ts`)
2. ✅ Updated AuthContext to call email service on sign in/sign up
3. ✅ Added backend API endpoints for email sending
4. ✅ Integrated browser detection and IP address retrieval
5. ✅ Added proper error handling (emails fail gracefully)

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install nodemailer
```

### Step 2: Update Environment Variables

Add to `.env.local`:

```env
# Email Service
SMTP_EMAIL=interviewvault.2026@gmail.com
SMTP_PASSWORD=Dheeraj@123

# API Configuration
VITE_API_URL=http://localhost:3000
VITE_APP_URL=http://localhost:5173
```

For production (`.env.production`):

```env
SMTP_EMAIL=interviewvault.2026@gmail.com
SMTP_PASSWORD=Dheeraj@123

VITE_API_URL=https://your-backend-api.com
VITE_APP_URL=https://your-frontend-domain.com
```

### Step 3: Deploy Backend Email API

You have **3 options** to deploy the email API:

#### **Option A: Netlify Functions (Recommended for Netlify)**

1. Create `netlify/functions/email.js`:

```bash
mkdir -p netlify/functions
cp backend/api/email.js netlify/functions/email.js
```

2. Update the function:

```javascript
// netlify/functions/email.js
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export const handler = async (event) => {
  const { action, ...data } = JSON.parse(event.body);

  try {
    if (action === 'signup') {
      return await handleSignUp(data);
    } else if (action === 'signin') {
      return await handleSignIn(data);
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

2. Deploy:

```bash
netlify deploy
```

#### **Option B: Vercel Functions**

1. Create `api/email.js` in root:

```bash
mkdir -p api
cp backend/api/email.js api/send-email.js
```

2. Update `vercel.json`:

```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "env": {
    "SMTP_EMAIL": "@smtp_email",
    "SMTP_PASSWORD": "@smtp_password"
  }
}
```

3. Deploy:

```bash
vercel deploy
```

#### **Option C: Express Backend (Local/VPS)**

1. Create backend server:

```bash
npm init -y
npm install express nodemailer cors dotenv
```

2. Create `server.js`:

```javascript
import express from 'express';
import cors from 'cors';
import { sendSignUpEmailAPI, sendSignInEmailAPI } from './backend/api/email.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Email endpoints
app.post('/api/email/signup', sendSignUpEmailAPI);
app.post('/api/email/signin', sendSignInEmailAPI);

app.listen(3000, () => {
  console.log('✅ Email API running on port 3000');
});
```

3. Start locally:

```bash
node server.js
```

---

## 🧪 Testing

### Test Sign In Email

1. Start your development server:

```bash
npm run dev
```

2. Sign in with your test account

3. Check your email inbox for login alert

### Test API Directly

```bash
# Test Sign In Email
curl -X POST http://localhost:3000/api/email/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "loginTime": "11/26/2025, 10:30:00 AM",
    "browserInfo": "Chrome on Windows",
    "ipAddress": "192.168.1.1"
  }'

# Test Sign Up Email
curl -X POST http://localhost:3000/api/email/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "fullName": "Test User"
  }'
```

---

## 📁 Project Structure

```
interview-compass/
├── src/
│   ├── utils/
│   │   └── emailService.ts       # Frontend email utility
│   └── contexts/
│       └── AuthContext.tsx       # Updated with email calls
├── backend/
│   └── api/
│       └── email.js              # Backend email API
├── netlify/
│   └── functions/
│       └── email.js              # Netlify deployment
├── api/
│   └── send-email.js             # Vercel deployment
└── email-templates/
    ├── signup-email.html
    └── signin-email.html
```

---

## 🔍 How It Works

### Sign In Flow

```
User clicks "Sign In"
        ↓
AuthContext.signIn() called
        ↓
User authenticated with Supabase
        ↓
sendSignInEmail() called (async, non-blocking)
        ↓
Email utility collects:
  - Email address
  - Current time
  - Browser info (from user-agent)
  - IP address (from ipify API)
        ↓
POST to /api/email/signin
        ↓
Backend loads signin-email.html template
        ↓
Replace template variables:
  {{email}}, {{loginTime}}, {{browserInfo}}, {{ipAddress}}
        ↓
Send via SMTP (Gmail)
        ↓
User receives email
```

### Sign Up Flow

```
User clicks "Sign Up"
        ↓
AuthContext.signUp() called
        ↓
User account created in Supabase
        ↓
sendSignUpEmail() called (async, non-blocking)
        ↓
Email utility prepares:
  - Email address
  - Full name
  - Dashboard URL
        ↓
POST to /api/email/signup
        ↓
Backend loads signup-email.html template
        ↓
Replace template variables:
  {{fullName}}, {{email}}, {{dashboardURL}}
        ↓
Send via SMTP (Gmail)
        ↓
User receives welcome email
```

---

## ⚠️ Troubleshooting

### Issue: "Cannot POST /api/email/signin"

**Solution:**
- Backend not running or API URL is wrong
- Update `VITE_API_URL` in `.env.local`
- Check CORS settings on backend

```javascript
// Add to backend
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-domain.com'],
  credentials: true
}));
```

### Issue: "Invalid login credentials"

**Solution:**
- Verify SMTP email and password
- For Gmail, use App Password (not main password)
- Enable 2-Step Verification in Gmail account

### Issue: "ENOENT: no such file or directory email-templates"

**Solution:**
- Verify templates are in correct directory
- Use absolute paths for file loading

```javascript
const templatePath = path.resolve(
  process.cwd(),
  'email-templates',
  `${templateName}.html`
);
```

### Issue: Email received but variables not replaced

**Solution:**
- Check template variable syntax: `{{variableName}}`
- Ensure variable names match exactly
- Check for extra spaces in template

---

## 🔒 Security Best Practices

1. **Never commit credentials:** Use environment variables
2. **Use App Passwords:** For Gmail, never use main password
3. **CORS whitelist:** Only allow your frontend domain
4. **Rate limiting:** Add rate limiting to email endpoints
5. **Validation:** Validate email format before sending
6. **Error handling:** Don't leak sensitive info in errors

---

## 📊 Email Service Architecture

```
┌─────────────────────────────────────────────────┐
│         Frontend (React)                         │
│  ┌──────────────────────────────────────┐       │
│  │ AuthContext (signIn/signUp)          │       │
│  └────────────┬─────────────────────────┘       │
│               │                                  │
│  ┌────────────▼──────────────────────────┐      │
│  │ emailService.ts                       │      │
│  │ - getBrowserInfo()                    │      │
│  │ - getClientIP()                       │      │
│  │ - sendSignInEmail()                   │      │
│  │ - sendSignUpEmail()                   │      │
│  └────────────┬──────────────────────────┘      │
└───────────────┼──────────────────────────────────┘
                │
                │ HTTP POST /api/email/signin
                │ HTTP POST /api/email/signup
                │
┌───────────────▼──────────────────────────────────┐
│         Backend (Node.js/Express)                │
│  ┌──────────────────────────────────────┐       │
│  │ email.js API                         │       │
│  │ - sendSignInEmailAPI()               │       │
│  │ - sendSignUpEmailAPI()               │       │
│  │ - verifyEmailAPI()                   │       │
│  └────────────┬─────────────────────────┘       │
│               │                                  │
│  ┌────────────▼──────────────────────────┐      │
│  │ NodeMailer                            │      │
│  │ - Load HTML template                 │      │
│  │ - Replace variables                  │      │
│  │ - Send via SMTP                      │      │
│  └────────────┬──────────────────────────┘      │
└───────────────┼──────────────────────────────────┘
                │
                │ SMTP (Gmail)
                │
┌───────────────▼──────────────────────────────────┐
│    Gmail SMTP Server                             │
│    smtp.gmail.com:587                            │
└──────────────────────────────────────────────────┘
```

---

## 📦 Files Modified

1. ✅ `src/contexts/AuthContext.tsx` - Added email service calls
2. ✅ `src/utils/emailService.ts` - Created frontend email utility
3. ✅ `backend/api/email.js` - Created backend email API

## 📦 Files Created

1. ✅ `backend/api/email.js` - Email API endpoints
2. ✅ `src/utils/emailService.ts` - Frontend email service
3. ✅ `email-templates/signup-email.html` - Welcome email
4. ✅ `email-templates/signin-email.html` - Login alert email

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`npm install nodemailer`)
- [ ] Environment variables set (`.env.local`)
- [ ] Backend API deployed or running locally
- [ ] Email templates in correct directory
- [ ] AuthContext updated with email service
- [ ] Test sign in to verify email is received
- [ ] Check browser console for any errors
- [ ] Verify email in spam folder if not in inbox

---

**Status:** ✅ Ready to Deploy  
**Last Updated:** November 26, 2025  
**Version:** 1.0.1
