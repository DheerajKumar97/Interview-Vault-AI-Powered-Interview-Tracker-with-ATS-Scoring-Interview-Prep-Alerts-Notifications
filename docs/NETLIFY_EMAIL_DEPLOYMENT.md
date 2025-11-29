# Email Notifications Deployment Guide

## What's Ready

Your application now has **Netlify Functions** configured to send emails automatically when users:
- ✅ **Sign Up** - Receives welcome email with platform benefits
- ✅ **Sign In** - Receives login alert with security details (browser, IP, time)

## Deployment Steps

### Step 1: Set Up Environment Variables on Netlify

1. Go to your Netlify site → **Site Settings** → **Build & Deploy** → **Environment**
2. Add these variables:
   ```
   SMTP_EMAIL = interviewvault.2026@gmail.com
   SMTP_PASSWORD = Dheeraj@123
   FRONTEND_URL = https://interview-compass.netlify.app (or your custom domain)
   ```

### Step 2: Deploy to Netlify

If you haven't already connected your GitHub repo to Netlify:
1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Connect to Git**
2. Select your repository: `interview-compass`
3. Netlify will auto-detect:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions: `netlify/functions` (automatic)

If already deployed:
1. Simply push to GitHub
2. Netlify will automatically rebuild and deploy
3. Functions are deployed to `/.netlify/functions/send-signin-email` and `/.netlify/functions/send-signup-email`

### Step 3: Test Email Functionality

After deployment:

1. **Test Sign Up:**
   - Go to your site and click "Get Started"
   - Sign up with a test email (Gmail account recommended)
   - Check your inbox for welcome email
   - Email subject: 🎉 Welcome to Interview Vault!

2. **Test Sign In:**
   - Login with the same credentials
   - Check your inbox for login alert email
   - Email subject: 🔐 New Login to Interview Vault
   - Email includes: Browser type, OS, IP address, Login time

### Step 4: Configure Gmail for Less Secure Apps (if needed)

If emails aren't sending:

1. Go to [https://myaccount.google.com/app-passwords](https://myaccount.google.com/app-passwords)
2. Generate an app password for Gmail
3. Use that password in `SMTP_PASSWORD` environment variable instead

OR enable Less Secure App Access:
1. Go to [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Turn on "Less secure app access"

## File Structure

```
netlify/
├── functions/
│   ├── send-signin-email.js      ← Login alert emails
│   └── send-signup-email.js      ← Welcome emails
└── netlify.toml                  ← Configuration

email-templates/
├── signin-email.html             ← Login alert template
└── signup-email.html             ← Welcome email template

src/
└── utils/
    └── emailService.ts           ← Frontend service
                                    (Calls Netlify Functions)
```

## How It Works

### User Signs In
```
1. User enters email/password
2. Supabase authenticates user
3. AuthContext calls sendSignInEmail()
4. Frontend calls /.netlify/functions/send-signin-email
5. Netlify Function loads signin-email.html template
6. Replaces {{email}}, {{browserInfo}}, {{ipAddress}}, {{loginTime}}
7. Sends email via Gmail SMTP
8. User receives email ✅
```

### User Signs Up
```
1. User fills signup form
2. Supabase creates account
3. AuthContext calls sendSignUpEmail()
4. Frontend calls /.netlify/functions/send-signup-email
5. Netlify Function loads signup-email.html template
6. Replaces {{fullName}}, {{email}}, {{dashboardURL}}
7. Sends email via Gmail SMTP
8. User receives welcome email ✅
```

## Troubleshooting

### Emails Not Sending?

1. **Check Netlify Functions logs:**
   - Go to Netlify → Functions → View logs
   - Look for errors in `send-signin-email` or `send-signup-email`

2. **Verify environment variables:**
   - Netlify → Site Settings → Build & Deploy → Environment
   - Confirm `SMTP_EMAIL` and `SMTP_PASSWORD` are set correctly

3. **Check email templates:**
   - Ensure `email-templates/` directory is in root
   - Both `signin-email.html` and `signup-email.html` must exist

4. **Gmail authentication:**
   - Gmail may block SMTP from Netlify servers
   - Enable "Less Secure App Access" for your Gmail account
   - Or generate an app-specific password

5. **Spam folder:**
   - Check inbox spam/promotions folder
   - Emails from new senders sometimes go to spam

### Function Timeout?

If functions timeout (>10 seconds):
- Netlify has a 10-second timeout for free tier
- Email sending usually takes 2-5 seconds
- Should not be an issue, but contact support if it occurs

## Optional: Custom Domain

If you have a custom domain:

1. Update `FRONTEND_URL` to your custom domain:
   ```
   FRONTEND_URL = https://yourdomain.com
   ```

2. Email links will point to your custom domain

## Production Checklist

- ✅ Environment variables set on Netlify
- ✅ Repository connected to Netlify
- ✅ Automatic deploys enabled
- ✅ Email templates present in `email-templates/`
- ✅ Gmail account configured for SMTP
- ✅ Tested sign up and sign in flows
- ✅ Checked email inbox and spam folder

## Next Steps

After successful deployment:

1. **Monitor:** Watch Netlify Function logs for any issues
2. **Customize:** Edit email templates in `email-templates/` folder
3. **Branding:** Update email sender name and logo
4. **Features:** Add password reset, forgot password emails

## Support

If emails still aren't working:
1. Check Netlify Function logs: `netlify/functions/send-signin-email.js` or `send-signup-email.js`
2. Verify Gmail credentials are correct
3. Ensure email templates exist in the project

---

**Status:** Ready for deployment to Netlify! 🚀
