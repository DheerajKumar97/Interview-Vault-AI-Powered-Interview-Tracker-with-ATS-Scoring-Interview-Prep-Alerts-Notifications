/**
 * Backend Email API Routes
 * Handles email sending for Sign Up and Sign In
 * 
 * Setup:
 * 1. Install: npm install nodemailer
 * 2. Deploy to Vercel or your backend
 * 3. Set CORS headers for your frontend domain
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// SMTP Transporter Configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL || 'interviewvault.2026@gmail.com',
      pass: process.env.SMTP_PASSWORD || 'Dheeraj@123',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Load HTML template from file
const loadTemplate = (templateName) => {
  try {
    const templatePath = path.join(
      process.cwd(),
      'email-templates',
      `${templateName}.html`
    );
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    return null;
  }
};

// Replace template variables
const replaceVariables = (template, variables) => {
  let html = template;
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, variables[key] || '');
  });
  return html;
};

// =====================================================
// SIGN UP EMAIL ENDPOINT
// =====================================================
export async function sendSignUpEmailAPI(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, fullName } = req.body;

    // Validate input
    if (!email || !fullName) {
      return res.status(400).json({ error: 'Email and fullName are required' });
    }

    // Load template
    const template = loadTemplate('signup-email');
    if (!template) {
      throw new Error('Failed to load sign up email template');
    }

    // Generate dashboard URL
    const dashboardURL =
      process.env.VITE_APP_URL ||
      'https://dheerajkumark-interview-vault.netlify.app';

    // Replace variables
    const htmlContent = replaceVariables(template, {
      fullName: fullName,
      email: email,
      dashboardURL: `${dashboardURL}/applications`,
    });

    // Create transporter
    const transporter = createTransporter();

    // Send email
    const info = await transporter.sendMail({
      from: `"Interview Vault" <interviewvault.2026@gmail.com>`,
      to: email,
      subject: `🎉 Welcome to Interview Vault, ${fullName}!`,
      html: htmlContent,
      headers: {
        'X-Priority': '3',
        'Importance': 'Normal',
      },
    });

    console.log('✅ Sign Up Email Sent:', info.messageId);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      email: email,
    });
  } catch (error) {
    console.error('❌ Error sending sign up email:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
    });
  }
}

// =====================================================
// SIGN IN EMAIL ENDPOINT
// =====================================================
export async function sendSignInEmailAPI(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, loginTime, browserInfo, ipAddress } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Load template
    const template = loadTemplate('signin-email');
    if (!template) {
      throw new Error('Failed to load sign in email template');
    }

    // Generate URLs
    const appURL =
      process.env.VITE_APP_URL ||
      'https://dheerajkumark-interview-vault.netlify.app';

    // Replace variables
    const htmlContent = replaceVariables(template, {
      email: email,
      loginTime: loginTime || new Date().toLocaleString(),
      browserInfo: browserInfo || 'Unknown Browser',
      ipAddress: ipAddress || 'Not Available',
      resetPasswordURL: `${appURL}/auth/forgot-password`,
      supportURL: `${appURL}/support`,
      settingsURL: `${appURL}/settings`,
      privacyURL: `${appURL}/privacy`,
    });

    // Create transporter
    const transporter = createTransporter();

    // Send email
    const info = await transporter.sendMail({
      from: `"Interview Vault Security" <interviewvault.2026@gmail.com>`,
      to: email,
      subject: '🔐 Interview Vault - Login Alert',
      html: htmlContent,
      headers: {
        'X-Priority': '2',
        'Importance': 'High',
      },
    });

    console.log('✅ Sign In Email Sent:', info.messageId);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      email: email,
    });
  } catch (error) {
    console.error('❌ Error sending sign in email:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
    });
  }
}

// =====================================================
// VERIFY EMAIL ENDPOINT (for testing)
// =====================================================
export async function verifyEmailAPI(req, res) {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    return res.status(200).json({
      success: true,
      message: 'SMTP connection verified',
    });
  } catch (error) {
    console.error('❌ SMTP verification failed:', error);
    return res.status(500).json({
      error: 'SMTP verification failed',
      details: error.message,
    });
  }
}

export default {
  sendSignUpEmailAPI,
  sendSignInEmailAPI,
  verifyEmailAPI,
};
