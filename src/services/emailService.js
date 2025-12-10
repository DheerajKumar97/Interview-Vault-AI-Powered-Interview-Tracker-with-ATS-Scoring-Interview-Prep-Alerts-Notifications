/**
 * Email Service using NodeMailer
 * Handles Sign Up and Sign In email notifications
 * SMTP: Gmail (interviewvault.2026@gmail.com)
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SMTP Configuration
const SMTP_CONFIG = {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'interviewvault2026@gmail.com',
    pass: process.env.SMTP_PASS,
  },
};

// Create Transporter
const transporter = nodemailer.createTransport(SMTP_CONFIG);

/**
 * Load email template from file
 * @param {string} templateName - Name of the template file
 * @returns {string} HTML content of the template
 */
const loadTemplate = (templateName) => {
  const templatePath = path.join(
    __dirname,
    '../../email-templates',
    `${templateName}.html`
  );
  return fs.readFileSync(templatePath, 'utf-8');
};

/**
 * Replace template variables with actual values
 * @param {string} template - HTML template
 * @param {object} variables - Key-value pairs to replace
 * @returns {string} HTML with replaced variables
 */
const replaceVariables = (template, variables) => {
  let html = template;
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, variables[key]);
  });
  return html;
};

/**
 * Send Sign Up (Welcome) Email
 * @param {object} userData - User data { email, fullName }
 * @returns {Promise} Email send result
 */
export const sendSignUpEmail = async (userData) => {
  try {
    const { email, fullName } = userData;

    // Load template
    let template = loadTemplate('signup-email');

    // Replace variables
    const dashboardURL = `${process.env.VITE_APP_URL || 'https://interview-compass.netlify.app'}/applications`;

    template = replaceVariables(template, {
      fullName: fullName || 'User',
      email: email,
      dashboardURL: dashboardURL,
    });

    // Send email
    const mailOptions = {
      from: `"Interview Vault" <interviewvault2026@gmail.com>`, // Fixed: removed dot
      to: email,
      subject: `🎉 Welcome to Interview Vault, ${fullName || 'User'}!`,
      html: template,
      headers: {
        'X-Priority': '3',
        'Importance': 'Normal',
      },
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('✅ Sign Up Email Sent Successfully');
    console.log('Message ID:', result.messageId);

    return {
      success: true,
      messageId: result.messageId,
      email: email,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error Sending Sign Up Email:', error);
    throw new Error(`Failed to send sign up email: ${error.message}`);
  }
};

/**
 * Send Sign In (Login Alert) Email
 * @param {object} loginData - Login data { email, loginTime, browserInfo, ipAddress }
 * @returns {Promise} Email send result
 */
export const sendSignInEmail = async (loginData) => {
  try {
    const { email, loginTime, browserInfo, ipAddress } = loginData;

    // Load template
    let template = loadTemplate('signin-email');

    // Generate URLs
    const resetPasswordURL = `${process.env.FRONTEND_URL || 'https://dheerajkumar-k-interview-vault.netlify.app'}/auth/forgot-password`;
    const supportURL = `${process.env.VITE_APP_URL || 'https://interview-compass.netlify.app'}/support`;
    const settingsURL = `${process.env.VITE_APP_URL || 'https://interview-compass.netlify.app'}/settings`;
    const privacyURL = `${process.env.VITE_APP_URL || 'https://interview-compass.netlify.app'}/privacy`;

    // Replace variables
    template = replaceVariables(template, {
      email: email,
      loginTime: loginTime || new Date().toLocaleString(),
      browserInfo: browserInfo || 'Unknown Browser',
      ipAddress: ipAddress || 'Not Available',
      resetPasswordURL: resetPasswordURL,
      supportURL: supportURL,
      settingsURL: settingsURL,
      privacyURL: privacyURL,
    });

    // Send email
    const mailOptions = {
      from: `"Interview Vault Security" <interviewvault2026@gmail.com>`, // Fixed: removed dot
      to: email,
      subject: '🔐 Interview Vault - Login Alert',
      html: template,
      headers: {
        'X-Priority': '2',
        'Importance': 'High',
      },
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('✅ Sign In Email Sent Successfully');
    console.log('Message ID:', result.messageId);

    return {
      success: true,
      messageId: result.messageId,
      email: email,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error Sending Sign In Email:', error);
    throw new Error(`Failed to send sign in email: ${error.message}`);
  }
};

/**
 * Verify SMTP Connection
 * @returns {Promise<boolean>} Connection status
 */
export const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP Connection Verified Successfully');
    return true;
  } catch (error) {
    console.error('❌ SMTP Connection Failed:', error);
    return false;
  }
};

/**
 * Send Test Emails
 * @param {string} testEmail - Email to send test to
 */
export const sendTestEmails = async (testEmail) => {
  try {
    console.log('🧪 Sending Test Emails...\n');

    // Test Sign Up Email
    console.log('📧 Testing Sign Up Email...');
    await sendSignUpEmail({
      email: testEmail,
      fullName: 'Test User',
    });

    // Wait 2 seconds before sending next email
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Sign In Email
    console.log('📧 Testing Sign In Email...');
    await sendSignInEmail({
      email: testEmail,
      loginTime: new Date().toLocaleString(),
      browserInfo: 'Chrome on Windows',
      ipAddress: '192.168.1.1',
    });

    console.log('\n✅ All Test Emails Sent Successfully!');
  } catch (error) {
    console.error('\n❌ Error Sending Test Emails:', error);
  }
};

export default {
  sendSignUpEmail,
  sendSignInEmail,
  verifyConnection,
  sendTestEmails,
};
