/**
 * Email Integration Guide for Interview Compass
 * How to integrate NodeMailer email notifications with your auth flow
 */

// ============================================
// INSTALLATION REQUIREMENTS
// ============================================

/*
1. Install NodeMailer:
   npm install nodemailer

2. Install nodemailer in your backend (if using Node.js backend):
   npm install nodemailer dotenv

3. Create a .env.local file with SMTP config:
   SMTP_EMAIL=interviewvault.2026@gmail.com
   SMTP_PASSWORD=Dheeraj@123
   APP_URL=http://localhost:3000
*/

// ============================================
// OPTION 1: Supabase Edge Functions Integration
// ============================================

/*
File: supabase/functions/send-signup-email/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SMTP_CONFIG = {
  from: "interviewvault.2026@gmail.com",
  password: "Dheeraj@123",
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email, fullName } = await req.json();

    // Load signup email template
    const htmlTemplate = await getSignUpEmailTemplate(email, fullName);

    // Send email via Supabase email service or external provider
    // Example using external email service
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email, name: fullName }],
          },
        ],
        from: {
          email: SMTP_CONFIG.from,
          name: "Interview Vault",
        },
        subject: `🎉 Welcome to Interview Vault, ${fullName}!`,
        html_content: htmlTemplate,
      }),
    });

    return new Response(
      JSON.stringify({ success: response.ok }),
      { status: response.status }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
*/

// ============================================
// OPTION 2: Backend Express/Node.js Integration
// ============================================

/*
File: backend/routes/auth.js

import express from 'express';
import { sendSignUpEmail, sendSignInEmail } from '../services/emailService.js';

const router = express.Router();

// Sign Up Route
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create user in Supabase/Database
    // ... user creation logic ...

    // Send welcome email
    try {
      await sendSignUpEmail({
        email: email,
        fullName: fullName,
      });
      console.log('✅ Sign up email sent to:', email);
    } catch (emailError) {
      console.error('⚠️ Email sending failed, but user created:', emailError);
      // Don't fail signup if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      email: email,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sign In Route
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate user
    // ... authentication logic ...

    // Get user browser and IP info
    const browserInfo = req.get('user-agent');
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Send login alert email
    try {
      await sendSignInEmail({
        email: email,
        loginTime: new Date().toLocaleString(),
        browserInfo: browserInfo,
        ipAddress: ipAddress,
      });
      console.log('✅ Sign in email sent to:', email);
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError);
      // Don't fail login if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: '...',
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(401).json({ error: error.message });
  }
});

export default router;
*/

// ============================================
// OPTION 3: React Context Integration (Client-Side)
// ============================================

/*
File: src/contexts/AuthContext.tsx (Updated)

import React, { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... existing code ...

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        // Call backend to send login alert email
        try {
          await fetch('/api/email/send-signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              fullName: data.user.user_metadata?.full_name,
            }),
          });
        } catch (emailError) {
          console.warn('Email notification failed:', emailError);
        }

        toast.success('Welcome back!');
        navigate('/applications');
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (!error && data.user) {
        // Call backend to send welcome email
        try {
          await fetch('/api/email/send-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              fullName: fullName,
            }),
          });
        } catch (emailError) {
          console.warn('Email notification failed:', emailError);
        }

        toast.success('Account created! Check your email to verify.');
        navigate('/auth/login');
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // ... rest of the code ...
};
*/

// ============================================
// EMAIL SERVICE CONFIGURATION
// ============================================

/*
SMTP Configuration Details:

Service: Gmail
Host: smtp.gmail.com
Port: 587
Secure: false
User: interviewvault.2026@gmail.com
Password: Dheeraj@123

⚠️ IMPORTANT: Gmail Security
- If using Gmail, enable "Less secure app access" OR
- Use an "App Password" for Gmail:
  1. Enable 2-Step Verification in Gmail Account
  2. Go to https://myaccount.google.com/apppasswords
  3. Generate a new app password for "Mail"
  4. Use that password in your .env file

Gmail App Password: (generate from above steps)
*/

// ============================================
// ENVIRONMENT VARIABLES
// ============================================

/*
Create .env.local or .env.production:

# SMTP Configuration
VITE_SMTP_EMAIL=interviewvault.2026@gmail.com
VITE_SMTP_PASSWORD=Dheeraj@123
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587

# Application URLs
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000

# Email Configuration
VITE_EMAIL_FROM_NAME=Interview Vault
VITE_EMAIL_SUPPORT=interviewvault.2026@gmail.com
*/

// ============================================
// TESTING EMAIL CONFIGURATION
// ============================================

/*
File: backend/test-email.js

import { sendSignUpEmail, sendSignInEmail, verifyConnection } from './services/emailService.js';

// Test SMTP Connection
console.log('🔍 Testing SMTP Connection...');
const isConnected = await verifyConnection();

if (!isConnected) {
  console.error('❌ Failed to connect to SMTP server');
  process.exit(1);
}

// Send test emails
console.log('\n📧 Sending Test Emails...');

// Test Sign Up Email
await sendSignUpEmail({
  email: 'your-email@example.com',
  fullName: 'Test User',
});

// Test Sign In Email
await sendSignInEmail({
  email: 'your-email@example.com',
  loginTime: new Date().toLocaleString(),
  browserInfo: 'Chrome on Windows',
  ipAddress: '192.168.1.100',
});

console.log('\n✅ Test Complete!');

// Run with: node backend/test-email.js
*/

// ============================================
// PACKAGE.JSON UPDATES
// ============================================

/*
{
  "dependencies": {
    "nodemailer": "^6.9.7",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14"
  },
  "scripts": {
    "test:email": "node backend/test-email.js",
    "start:backend": "node backend/server.js"
  }
}
*/

// ============================================
// TROUBLESHOOTING
// ============================================

/*
Common Issues and Solutions:

1. "Invalid login" error
   - Ensure you're using the correct email and password
   - For Gmail, use App Password (not regular password)
   - Enable "Less secure app access" if needed

2. "Connect ECONNREFUSED"
   - SMTP server is not responding
   - Check internet connection
   - Verify SMTP host and port settings

3. "Message rejected"
   - Check email format
   - Verify 'From' email address is correctly configured
   - Check email size (too large attachments)

4. "No such file or directory" for templates
   - Verify email template files exist in correct directory
   - Check file paths are correct
   - Use absolute paths if necessary

5. Email not received in Gmail
   - Check spam/promotions folder
   - Add sender to contacts
   - Verify email address is correct
*/

export const INTEGRATION_GUIDE = {
  description: 'Email Service Integration Guide',
  smtp: {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    email: 'interviewvault.2026@gmail.com',
    password: 'Dheeraj@123',
  },
  templates: {
    signup: 'signup-email.html',
    signin: 'signin-email.html',
  },
  endpoints: {
    sendSignup: '/api/email/send-signup',
    sendSignin: '/api/email/send-signin',
  },
};
