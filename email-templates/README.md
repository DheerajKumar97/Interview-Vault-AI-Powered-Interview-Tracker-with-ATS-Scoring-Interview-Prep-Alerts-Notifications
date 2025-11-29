# 📧 Email Templates & NodeMailer Setup

Professional email templates for Interview Vault with complete NodeMailer integration guide.

## 📋 Table of Contents

- [Email Templates Overview](#-email-templates-overview)
- [SMTP Configuration](#-smtp-configuration)
- [Installation](#-installation)
- [Usage](#-usage)
- [Template Variables](#-template-variables)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)

---

## 📧 Email Templates Overview

### 1. **Sign Up Email (Welcome Mail)** 📨
**File:** `signup-email.html`

**Purpose:** Welcome new users who just created their account

**Features:**
- ✨ Warm and welcoming tone
- 🎯 Highlights key platform benefits
- 📝 7 interview stages information
- 💡 Getting started tips
- 🔗 Clear CTA button to dashboard
- 🎨 Beautiful gradient design with purple/blue theme
- 📱 Fully responsive for mobile devices

**Key Sections:**
1. Header with Interview Vault branding
2. Personalized greeting
3. Introduction to the platform
4. Benefits list (7 key features)
5. Call-to-Action button
6. Getting started tips
7. Support information
8. Footer with social links

---

### 2. **Sign In Email (Login Alert)** 🔐
**File:** `signin-email.html`

**Purpose:** Notify users of login activity for security

**Features:**
- 🔒 Security-focused messaging
- 📊 Login details (time, browser, IP)
- ⚠️ Suspicious activity warning
- 🚨 Password reset option
- 🎯 Professional and concise
- 📱 Mobile-responsive design

**Key Sections:**
1. Header with security icon
2. Login confirmation alert
3. Detailed login information (time, browser, IP)
4. Confirmation message
5. Security warning for unauthorized access
6. Password reset link
7. Footer with support links

---

## 🛠 SMTP Configuration

### Gmail SMTP Details

```
Service: Gmail
Host: smtp.gmail.com
Port: 587 (TLS)
Secure: false
User: interviewvault.2026@gmail.com
Password: Dheeraj@123
```

### Gmail App Password Setup

1. Enable 2-Step Verification in Google Account
2. Visit: https://myaccount.google.com/apppasswords
3. Select "Mail" and "Windows Computer"
4. Generate 16-character password
5. Use this password in your application

---

## 📦 Installation

### Step 1: Install NodeMailer

```bash
npm install nodemailer
```

### Step 2: Install TypeScript Types (Optional)

```bash
npm install --save-dev @types/nodemailer
```

### Step 3: Create Environment Variables

Create `.env.local`:

```env
# SMTP Configuration
SMTP_EMAIL=interviewvault.2026@gmail.com
SMTP_PASSWORD=Dheeraj@123
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Application URLs
VITE_APP_URL=http://localhost:5173
API_URL=http://localhost:3000
```

### Step 4: Copy Email Templates

Email templates should be placed in:
```
/email-templates/
├── signup-email.html
└── signin-email.html
```

---

## 💻 Usage

### Basic Email Service Example

```javascript
import { sendSignUpEmail, sendSignInEmail } from './services/emailService.js';

// Send Sign Up Email
await sendSignUpEmail({
  email: 'user@example.com',
  fullName: 'John Doe'
});

// Send Sign In Email
await sendSignInEmail({
  email: 'user@example.com',
  loginTime: new Date().toLocaleString(),
  browserInfo: 'Chrome on Windows',
  ipAddress: '192.168.1.1'
});
```

### Integration with Supabase Auth

```typescript
import { supabase } from '@/integrations/supabase/client';
import { sendSignUpEmail } from '@/services/emailService';

const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (!error && data.user) {
      // Send welcome email
      await sendSignUpEmail({
        email: email,
        fullName: fullName
      });
    }

    return { error };
  } catch (error) {
    return { error };
  }
};
```

### Integration with Express Backend

```javascript
import express from 'express';
import { sendSignUpEmail, sendSignInEmail } from './services/emailService.js';

const app = express();

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, fullName } = req.body;

    // Create user logic...

    // Send welcome email
    await sendSignUpEmail({
      email: email,
      fullName: fullName
    });

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email } = req.body;
    const browserInfo = req.get('user-agent');
    const ipAddress = req.ip;

    // Send login alert email
    await sendSignInEmail({
      email: email,
      loginTime: new Date().toLocaleString(),
      browserInfo: browserInfo,
      ipAddress: ipAddress
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📝 Template Variables

### Sign Up Email Variables

| Variable | Description | Example |
|---|---|---|
| `{{fullName}}` | User's full name | John Doe |
| `{{email}}` | User's email address | john@example.com |
| `{{dashboardURL}}` | Link to applications dashboard | https://app.com/applications |

### Sign In Email Variables

| Variable | Description | Example |
|---|---|---|
| `{{email}}` | User's email address | john@example.com |
| `{{loginTime}}` | Login timestamp | 11/26/2025, 10:30:45 AM |
| `{{browserInfo}}` | Browser and OS info | Chrome on Windows 10 |
| `{{ipAddress}}` | IP address of login | 192.168.1.100 |
| `{{resetPasswordURL}}` | Password reset link | https://app.com/reset-password |
| `{{supportURL}}` | Support page link | https://app.com/support |
| `{{settingsURL}}` | Account settings link | https://app.com/settings |
| `{{privacyURL}}` | Privacy policy link | https://app.com/privacy |

---

## 🧪 Testing

### Verify SMTP Connection

```javascript
import { verifyConnection } from './services/emailService.js';

const isConnected = await verifyConnection();
console.log(isConnected ? '✅ Connected' : '❌ Failed');
```

### Send Test Emails

```javascript
import { sendTestEmails } from './services/emailService.js';

await sendTestEmails('test@example.com');
```

### Test with Mailtrap

1. Create free account at https://mailtrap.io/
2. Get SMTP credentials from Mailtrap
3. Update `.env` with Mailtrap credentials
4. Send test emails to Mailtrap inbox
5. View rendered emails in Mailtrap dashboard

---

## 🐛 Troubleshooting

### Connection Issues

**Problem:** "Connect ECONNREFUSED"

**Solution:**
- Verify SMTP host and port
- Check internet connection
- Ensure firewall doesn't block SMTP port 587

```javascript
// Test connection with detailed logging
try {
  await transporter.verify();
  console.log('✅ SMTP connection successful');
} catch (error) {
  console.error('❌ SMTP Error:', error.message);
}
```

---

### Authentication Issues

**Problem:** "Invalid login credentials"

**Solutions:**
- For Gmail: Use App Password (not regular password)
- For Gmail: Enable "Less secure app access"
- Verify email and password are correct
- Check for extra spaces in credentials

```javascript
// Verify credentials
const testAuth = async () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'interviewvault.2026@gmail.com',
      pass: 'Dheeraj@123'
    }
  });

  try {
    await transporter.verify();
    console.log('✅ Auth successful');
  } catch (error) {
    console.error('❌ Auth failed:', error);
  }
};
```

---

### Template Issues

**Problem:** "ENOENT: no such file or directory"

**Solution:**
- Verify email template files exist
- Check file paths are correct
- Use absolute paths for file references

```javascript
// Use absolute path
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(__dirname, '../email-templates/signup-email.html');
```

---

### Email Not Being Received

**Problem:** Emails sent but not in inbox

**Solutions:**
1. Check spam/promotions folder
2. Add sender to contacts
3. Verify recipient email is correct
4. Check DKIM/SPF/DMARC settings

---

## 📊 Email Sending Best Practices

1. **Error Handling:** Don't fail signup/login if email fails
2. **Rate Limiting:** Limit emails per user per hour
3. **Retry Logic:** Implement retry mechanism for failed emails
4. **Logging:** Log all email send attempts
5. **Unsubscribe:** Include unsubscribe option in emails
6. **Templating:** Use variable replacement for personalization
7. **Testing:** Always test emails before deployment

---

## 🔒 Security Considerations

1. **Never hardcode credentials:** Use environment variables
2. **Use App Passwords:** For Gmail, never use main password
3. **Enable TLS:** Always use secure SMTP connections
4. **Validate Emails:** Verify email format before sending
5. **DKIM/SPF:** Set up email authentication
6. **Rate Limit:** Prevent email bombing
7. **Encryption:** Use HTTPS for credential transmission

---

## 📞 Support

For issues or questions:
- Email: interviewvault.2026@gmail.com
- GitHub Issues: https://github.com/DheerajKumar97/interview-compass/issues
- Documentation: Check EMAIL_INTEGRATION_GUIDE.md

---

**Created:** November 26, 2025  
**Last Updated:** November 26, 2025  
**Version:** 1.0.0
