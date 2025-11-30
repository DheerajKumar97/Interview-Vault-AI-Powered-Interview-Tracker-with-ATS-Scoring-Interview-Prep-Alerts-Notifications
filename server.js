import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import dns from 'dns';
import net from 'net';
import axios from 'axios';

const { promises: dnsPromises } = dns;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Create transporter with Gmail (using working credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'interviewvault2026@gmail.com',
    pass: process.env.SMTP_PASS
  }
});

// Sign In Email
app.post('/api/send-signin-email', async (req, res) => {
  try {
    const { email, fullName, browserInfo, ipAddress, loginTime } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Sending Sign In email to:', email);

    const mailOptions = {
      from: 'interviewvault2026@gmail.com',
      to: email,
      subject: '🔐 New Login to Interview Vault',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
                .logo { width: 240px; height: auto; margin-bottom: 20px; }
                .content { padding: 40px 30px; }
                .alert-box { background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px; }
                .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .info-table td { padding: 12px 0; border-bottom: 1px solid #eee; color: #333; }
                .info-label { font-weight: 600; color: #666; width: 100px; }
                .footer { background-color: #f8f9fa; padding: 25px; text-align: center; font-size: 13px; color: #888; border-top: 1px solid #eee; }
                .btn { display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 25px 0; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); }
                h1 { margin: 0; font-size: 24px; font-weight: 700; }
                p { line-height: 1.6; color: #444; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://raw.githubusercontent.com/DheerajKumar97/interview-compass/main/public/logo.png" alt="Interview Vault" class="logo">
                    <h1>New Login Detected</h1>
                </div>
                <div class="content">
                    <p>Hello ${fullName || 'User'},</p>
                    <p>We detected a new login to your Interview Vault account.</p>
                    
                    <div class="alert-box">
                        <strong>⚠️ Security Alert:</strong> If this wasn't you, please change your password immediately.
                    </div>
                    
                    <h3>Login Details</h3>
                    <table class="info-table">
                        <tr>
                            <td class="info-label">Email:</td>
                            <td>${email}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Time:</td>
                            <td>${loginTime || new Date().toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Browser:</td>
                            <td>${browserInfo || 'Unknown'}</td>
                        </tr>
                        <tr>
                            <td class="info-label">IP Address:</td>
                            <td>${ipAddress || 'Not Available'}</td>
                        </tr>
                    </table>
                    
                    <p style="margin-top: 35px; text-align: center;">
                        <a href="https://interview-compass.netlify.app/auth/forgot-password" class="btn">Reset Password</a>
                    </p>
                    
                    <p style="margin-top: 30px; font-size: 14px; color: #666;">Questions? Contact us at <a href="mailto:interviewvault.2026@gmail.com" style="color: #667eea; text-decoration: none;">interviewvault.2026@gmail.com</a></p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Interview Vault. All rights reserved.</p>
                    <p>Made by <strong>Dheeraj Kumar K</strong> for Job Seekers</p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Sign In email sent:', info.messageId);
    res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Sign in email sent successfully'
    });
  } catch (error) {
    console.error('❌ Error sending sign in email:', error.message);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// Sign Up Email
app.post('/api/send-signup-email', async (req, res) => {
  try {
    const { email, fullName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Sending Sign Up email to:', email);

    const mailOptions = {
      from: 'interviewvault2026@gmail.com',
      to: email,
      subject: '🎉 Welcome to Interview Vault!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px 20px; text-align: center; position: relative; }
                .logo { width: 300px; height: auto; margin-bottom: 25px; }
                .content { padding: 40px 30px; }
                .welcome-text { font-size: 18px; color: #333; line-height: 1.6; text-align: center; margin-bottom: 30px; }
                .features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 30px 0; }
                .feature-card { background: #f8f9fa; padding: 15px; border-radius: 10px; text-align: center; border: 1px solid #eee; }
                .feature-icon { font-size: 24px; margin-bottom: 10px; display: block; }
                .feature-title { font-weight: 700; color: #444; display: block; margin-bottom: 5px; font-size: 14px; }
                .feature-desc { font-size: 12px; color: #666; }
                .btn { display: block; width: 200px; margin: 30px auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 0; border-radius: 50px; text-decoration: none; font-weight: 700; text-align: center; box-shadow: 0 4px 15px rgba(118, 75, 162, 0.4); transition: transform 0.2s; }
                .btn:hover { transform: translateY(-2px); }
                .footer { background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 13px; color: #888; border-top: 1px solid #eee; }
                h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
                h2 { color: #333; font-size: 20px; margin-top: 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://raw.githubusercontent.com/DheerajKumar97/interview-compass/main/public/logo.png" alt="Interview Vault" class="logo">
                    <h1>Welcome Aboard! 🚀</h1>
                    <p style="margin-top: 10px; opacity: 0.9;">Your dream job is just around the corner</p>
                </div>
                <div class="content">
                    <p class="welcome-text">Hi ${fullName || 'Future Achiever'},<br>Thank you for joining <strong>Interview Vault</strong>. We've built the ultimate tool to help you organize, track, and ace your job search.</p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://interview-compass.netlify.app/applications" class="btn">Start Tracking Now</a>
                    </div>

                    <h3 style="text-align: center; color: #555;">Everything you need to succeed:</h3>
                    
                    <div class="features-grid">
                        <div class="feature-card">
                            <span class="feature-icon">📊</span>
                            <span class="feature-title">Track Applications</span>
                            <span class="feature-desc">All your applications in one organized dashboard</span>
                        </div>
                        <div class="feature-card">
                            <span class="feature-icon">📅</span>
                            <span class="feature-title">Schedule Interviews</span>
                            <span class="feature-desc">Never miss a meeting with built-in calendar</span>
                        </div>
                        <div class="feature-card">
                            <span class="feature-icon">📈</span>
                            <span class="feature-title">View Analytics</span>
                            <span class="feature-desc">Visualize your progress and success rate</span>
                        </div>
                        <div class="feature-card">
                            <span class="feature-icon">📝</span>
                            <span class="feature-title">Manage Notes</span>
                            <span class="feature-desc">Keep track of important details and feedback</span>
                        </div>
                    </div>
                    
                    <p style="text-align: center; margin-top: 40px; color: #666;">
                        Need help getting started? <br>
                        Contact us at <a href="mailto:interviewvault.2026@gmail.com" style="color: #667eea; text-decoration: none; font-weight: 600;">interviewvault.2026@gmail.com</a>
                    </p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Interview Vault. All rights reserved.</p>
                    <p>Made by <strong>Dheeraj Kumar K</strong> for Job Seekers</p>
                    <div style="margin-top: 15px;">
                        <a href="#" style="color: #888; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
                        <a href="#" style="color: #888; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Sign Up email sent:', info.messageId);
    res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Welcome email sent successfully'
    });
  } catch (error) {
    console.error('❌ Error sending sign up email:', error.message);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
});



// Email Digest Endpoint
app.post('/api/send-digest-email', async (req, res) => {
  try {
    const { email, userId, frequency, dashboardImage, dashboardPdf } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Sending Email Digest to:', email);

    const frequencyLabels = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'bi-weekly': 'Bi-Weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly'
    };

    const attachments = [];
    if (dashboardImage) {
      attachments.push({
        filename: 'dashboard-snapshot.png',
        content: dashboardImage.split('base64,')[1],
        encoding: 'base64'
      });
    }
    if (dashboardPdf) {
      attachments.push({
        filename: 'dashboard-report.pdf',
        content: dashboardPdf.split('base64,')[1],
        encoding: 'base64'
      });
    }

    const mailOptions = {
      from: '"Interview Vault" <interviewvault2026@gmail.com>',
      to: email,
      subject: `📊 Your ${frequencyLabels[frequency] || 'Scheduled'} Interview Vault Digest`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 700px; margin: 20px auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 40px 20px; text-align: center; }
                .logo { width: 280px; height: auto; margin-bottom: 20px; }
                .content { padding: 40px 30px; }
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 30px 0; }
                .stat-card { background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); padding: 20px; border-radius: 12px; text-align: center; border: 2px solid #A78BFA; }
                .stat-number { font-size: 32px; font-weight: 800; color: #6D28D9; display: block; margin-bottom: 5px; }
                .stat-label { font-size: 13px; color: #7C3AED; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .table-container { margin: 30px 0; overflow-x: auto; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 15px; text-align: left; font-weight: 600; font-size: 14px; }
                .data-table td { padding: 12px 15px; border-bottom: 1px solid #E9D5FF; color: #374151; font-size: 13px; }
                .data-table tr:hover { background-color: #FAF5FF; }
                .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
                .status-screening { background: #DBEAFE; color: #1E40AF; }
                .status-shortlisted { background: #F3E8FF; color: #6D28D9; }
                .status-interview { background: #E0E7FF; color: #4338CA; }
                .status-selected { background: #D1FAE5; color: #065F46; }
                .status-ghosted { background: #FEE2E2; color: #991B1B; }
                .footer { background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%); padding: 30px; text-align: center; font-size: 13px; color: #6B7280; border-top: 3px solid #8B5CF6; }
                .btn { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 25px 0; font-weight: 600; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3); }
                h1 { margin: 0; font-size: 28px; font-weight: 800; }
                h2 { color: #6D28D9; font-size: 22px; margin-top: 30px; margin-bottom: 15px; }
                p { line-height: 1.6; color: #4B5563; }
                .highlight { background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 50%); padding: 20px; border-radius: 10px; border-left: 4px solid #8B5CF6; margin: 25px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://raw.githubusercontent.com/DheerajKumar97/interview-compass/main/public/logo.png" alt="Interview Vault" class="logo">
                    <h1>📊 Your ${frequencyLabels[frequency]} Digest</h1>
                    <p style="margin-top: 10px; opacity: 0.95; font-size: 16px;">Application Tracking Summary</p>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>Here's your ${frequencyLabels[frequency].toLowerCase()} summary of your interview applications in <strong>Interview Vault</strong>.</p>
                    
                    <div class="highlight">
                        <strong style="color: #6D28D9;">📈 Quick Stats:</strong><br>
                        Your application tracking dashboard shows your latest progress. Keep up the great work!
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-number">--</span>
                            <span class="stat-label">Total Apps</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">--</span>
                            <span class="stat-label">Interviews</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">--</span>
                            <span class="stat-label">Offers</span>
                        </div>
                    </div>

                    <h2>📋 Recent Applications</h2>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Position</th>
                                    <th>Status</th>
                                    <th>Applied Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="4" style="text-align: center; padding: 30px; color: #9CA3AF;">
                                        Visit your dashboard to see detailed application data
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p style="text-align: center; margin-top: 40px;">
                        <a href="https://interview-compass.netlify.app/dashboard" class="btn">View Full Dashboard</a>
                    </p>
                    
                    <p style="margin-top: 35px; font-size: 14px; color: #6B7280; text-align: center;">
                        Questions? Contact us at <a href="mailto:interviewvault.2026@gmail.com" style="color: #8B5CF6; text-decoration: none; font-weight: 600;">interviewvault.2026@gmail.com</a>
                    </p>
                </div>
                <div class="footer">
                    <p><strong>Interview Vault</strong> - Your Job Application Companion</p>
                    <p>&copy; 2025 Interview Vault. All rights reserved.</p>
                    <p>Made by <strong>Dheeraj Kumar K</strong> for Job Seekers</p>
                    <p style="margin-top: 15px; font-size: 12px;">
                        <a href="#" style="color: #8B5CF6; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
                        <a href="#" style="color: #8B5CF6; text-decoration: none; margin: 0 10px;">Preferences</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email Digest sent:', info.messageId);
    res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Email digest sent successfully'
    });
  } catch (error) {
    console.error('❌ Error sending email digest:', error.message);
    res.status(500).json({
      error: 'Failed to send email digest',
      message: error.message
    });
  }
});

import { checkEmail } from './email_validation.js';

// ... (existing imports)

// Email Validation Endpoint with DNS and SMTP checks
app.post('/api/validate-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Validating email:', email);

    // Use the centralized validation logic
    const result = await checkEmail(email);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error validating email:', error.message);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message,
      valid: false,
      mailboxExists: false
    });
  }
});

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔑 Using service role key:', supabaseKey ? 'YES (length: ' + supabaseKey.length + ')' : 'NO');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// TEST: Simple cron job to verify cron is working
cron.schedule('* * * * *', () => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] Cron is working! Current time: ${new Date().toLocaleTimeString()}\n`;

  console.log('🧪 TEST CRON:', logMessage.trim());

  // Write to file
  fs.appendFileSync(path.join(__dirname, 'cron-test.log'), logMessage);
});

// Scheduled Digest Job (Runs every minute to check for due digests)
cron.schedule('* * * * *', async () => {
  console.log('⏰ Checking for scheduled email digests...');
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Format current time as HH:MM:00
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;
    console.log(`   Current server time: ${currentTimeString}`);

    // 1. Fetch all active digest preferences
    const { data: preferences, error: prefError } = await supabase
      .from('email_digest_preferences')
      .select('*')
      .eq('is_active', true);

    if (prefError) {
      console.error('❌ Error fetching preferences:', prefError);
      console.error('   Error details:', JSON.stringify(prefError, null, 2));
      return;
    }

    console.log(`   Fetched ${preferences?.length || 0} active preferences.`);
    if (preferences && preferences.length > 0) {
      console.log('   Preferences data:', JSON.stringify(preferences, null, 2));
    } else {
      console.log('   ⚠️  No preferences found. Checking if table has any data...');
      // Try fetching without the is_active filter to see if there's any data at all
      const { data: allPrefs, error: allError } = await supabase
        .from('email_digest_preferences')
        .select('*');
      console.log(`   Total preferences in table: ${allPrefs?.length || 0}`);
      if (allPrefs && allPrefs.length > 0) {
        console.log('   Sample data:', JSON.stringify(allPrefs[0], null, 2));
      }
    }

    if (!preferences || preferences.length === 0) return;

    // 2. Filter for those scheduled NOW
    const duePreferences = preferences.filter(pref => {
      const prefTime = pref.scheduled_time;
      if (!prefTime) return false;

      // Handle potential time formats (HH:MM:00 or HH:MM)
      const [prefHourStr, prefMinuteStr] = prefTime.split(':');
      const prefHour = parseInt(prefHourStr);
      const prefMinute = parseInt(prefMinuteStr);

      const isMatch = prefHour === currentHour && prefMinute === currentMinute;

      // Log match attempts for debugging (only if hour matches to reduce noise)
      if (prefHour === currentHour) {
        console.log(`   Checking match: Pref ${prefTime} vs Current ${currentHour}:${currentMinute} -> ${isMatch}`);
      }

      return isMatch;
    });

    if (duePreferences.length === 0) return;

    console.log(`   Found ${duePreferences.length} digests due for sending.`);

    // 3. Process each due preference
    for (const pref of duePreferences) {
      let email = null;

      // Try to get email from auth.admin first (most reliable)
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(pref.user_id);
          if (!userError && userData?.user) {
            email = userData.user.email;
            console.log(`   ✅ Found email from auth.admin: ${email}`);
          } else {
            console.log(`   ⚠️  auth.admin.getUserById error:`, userError);
          }
        } catch (err) {
          console.log(`   ⚠️  auth.admin.getUserById exception:`, err.message);
        }
      }

      // Fallback: try profiles table
      if (!email) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', pref.user_id)
          .single();

        if (!profileError && profile?.email) {
          email = profile.email;
          console.log(`   ✅ Found email from profiles: ${email}`);
        } else {
          console.log(`   ⚠️  profiles query error:`, profileError);
        }
      }

      if (!email) {
        console.error(`   ❌ Could not find email for user ${pref.user_id}`);
        continue;
      }

      // Fetch user stats
      const { count: totalApps } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', pref.user_id);

      console.log(`🚀 Sending scheduled digest to ${email}`);
      await sendDigestEmailInternal(email, pref.frequency, totalApps || 0, pref.user_id);
    }

  } catch (error) {
    console.error('❌ Error in scheduled digest job:', error);
  }
});

async function sendDigestEmailInternal(email, frequency, totalApps, userId) {
  const frequencyLabels = {
    'daily': 'Daily',
    'weekly': 'Weekly',
    'bi-weekly': 'Bi-Weekly',
    'monthly': 'Monthly',
    'quarterly': 'Quarterly'
  };

  // Fetch detailed stats
  const { data: applications, error: appsError } = await supabase
    .from('applications')
    .select(`
      id,
      current_status,
      job_title,
      applied_date,
      name,
      companies (name)
    `)
    .eq('user_id', userId)
    .order('applied_date', { ascending: false })
    .limit(10);

  let interviewCount = 0;
  let offerCount = 0;
  let recentApps = [];

  if (!appsError && applications) {
    interviewCount = applications.filter(app =>
      ['Interview Scheduled', 'Interview Rescheduled'].includes(app.current_status)
    ).length;

    offerCount = applications.filter(app =>
      ['Offer Released', 'Selected'].includes(app.current_status)
    ).length;

    recentApps = applications.slice(0, 5).map(app => ({
      company: app.companies?.name || app.name || 'N/A',
      position: app.job_title || 'N/A',
      status: app.current_status || 'N/A',
      date: new Date(app.applied_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }));
  }

  const recentAppsRows = recentApps.length > 0
    ? recentApps.map(app => `
        <tr>
          <td>${app.company}</td>
          <td>${app.position}</td>
          <td><span class="status-badge">${app.status}</span></td>
          <td>${app.date}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: #9CA3AF;">
            No recent applications found
          </td>
        </tr>
      `;

  const mailOptions = {
    from: '"Interview Vault" <interviewvault2026@gmail.com>',
    to: email,
    subject: `📊 Your ${frequencyLabels[frequency] || 'Scheduled'} Interview Vault Digest`,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
                .container { max-width: 700px; margin: 20px auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
                .header { background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 40px 20px; text-align: center; }
                .logo { width: 280px; height: auto; margin-bottom: 20px; }
                .content { padding: 40px 30px; }
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 30px 0; }
                .stat-card { background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); padding: 20px; border-radius: 12px; text-align: center; border: 2px solid #A78BFA; }
                .stat-number { font-size: 32px; font-weight: 800; color: #6D28D9; display: block; margin-bottom: 5px; }
                .stat-label { font-size: 13px; color: #7C3AED; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .table-container { margin: 30px 0; overflow-x: auto; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 15px; text-align: left; font-weight: 600; font-size: 14px; }
                .data-table td { padding: 12px 15px; border-bottom: 1px solid #E9D5FF; color: #374151; font-size: 13px; }
                .data-table tr:hover { background-color: #FAF5FF; }
                .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #E0E7FF; color: #4338CA; }
                .footer { background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%); padding: 30px; text-align: center; font-size: 13px; color: #6B7280; border-top: 3px solid #8B5CF6; }
                .btn { display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 25px 0; font-weight: 600; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3); }
                h1 { margin: 0; font-size: 28px; font-weight: 800; }
                h2 { color: #6D28D9; font-size: 22px; margin-top: 30px; margin-bottom: 15px; }
                p { line-height: 1.6; color: #4B5563; }
                .highlight { background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 50%); padding: 20px; border-radius: 10px; border-left: 4px solid #8B5CF6; margin: 25px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://raw.githubusercontent.com/DheerajKumar97/interview-compass/main/public/logo.png" alt="Interview Vault" class="logo">
                    <h1>📊 Your ${frequencyLabels[frequency]} Digest</h1>
                    <p style="margin-top: 10px; opacity: 0.95; font-size: 16px;">Application Tracking Summary</p>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>Here's your ${frequencyLabels[frequency].toLowerCase()} summary of your interview applications in <strong>Interview Vault</strong>.</p>
                    
                    <div class="highlight">
                        <strong style="color: #6D28D9;">📈 Quick Stats:</strong><br>
                        Your application tracking dashboard shows your latest progress. Keep up the great work!
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-number">${totalApps || 0}</span>
                            <span class="stat-label">Total Apps</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${interviewCount}</span>
                            <span class="stat-label">Interviews</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number">${offerCount}</span>
                            <span class="stat-label">Offers</span>
                        </div>
                    </div>

                    <h2>📋 Recent Applications</h2>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Position</th>
                                    <th>Status</th>
                                    <th>Applied Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentAppsRows}
                            </tbody>
                        </table>
                    </div>

                    <p style="text-align: center; margin-top: 40px;">
                        <a href="${process.env.VITE_APP_URL || 'http://localhost:8080'}/dashboard" class="btn">View Full Dashboard</a>
                    </p>
                    
                    <p style="margin-top: 35px; font-size: 14px; color: #6B7280; text-align: center;">
                        Questions? Contact us at <a href="mailto:interviewvault.2026@gmail.com" style="color: #8B5CF6; text-decoration: none; font-weight: 600;">interviewvault.2026@gmail.com</a>
                    </p>
                </div>
                <div class="footer">
                    <p><strong>Interview Vault</strong> - Your Job Application Companion</p>
                    <p>&copy; 2025 Interview Vault. All rights reserved.</p>
                    <p>Made by <strong>Dheeraj Kumar K</strong> for Job Seekers</p>
                    <p style="margin-top: 15px; font-size: 12px;">
                        <a href="#" style="color: #8B5CF6; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
                        <a href="#" style="color: #8B5CF6; text-decoration: none; margin: 0 10px;">Preferences</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
      `
  };

  console.log(`   📧 Sending email to ${email}...`);
  const info = await transporter.sendMail(mailOptions);
  console.log(`   ✅ Email sent successfully! Message ID: ${info.messageId}`);
}

// Gemini Project Suggestions Endpoint
app.post('/api/generate-projects', async (req, res) => {
  try {
    const { jobDescription, companyName, jobTitle, apiKey } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    console.log('🤖 Generating project suggestions for:', companyName, '-', jobTitle);

    // Use custom key if provided, otherwise fallback to env var
    const GEMINI_API_KEY = apiKey || process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not found');
      return res.status(401).json({
        error: 'Gemini API key not configured',
        requiresKey: true
      });
    }

    const prompt = `Based on the following job description for ${jobTitle} at ${companyName}, generate 3-5 innovative project ideas that would be impressive for a portfolio and demonstrate the required skills. For each project, provide:
1. **Project Title** (Make sure the title is bold)
2. Brief Description (2-3 sentences)
3. Key Technologies/Skills Used
4. Why it's impressive for this role

Job Description:
${jobDescription}

Format the response as a clear, structured markdown list. Ensure all Project Titles are wrapped in double asterisks (e.g. **Project Name**).`;

    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

    const response = await axios.post(
      `${API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const suggestions = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions generated';

    console.log('✅ Project suggestions generated successfully');
    res.status(200).json({
      success: true,
      suggestions: suggestions
    });

  } catch (error) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {};

    console.error(`❌ Error generating project suggestions (${status}):`, JSON.stringify(errorData));

    res.status(status).json({
      error: 'Failed to generate project suggestions',
      message: error.message,
      details: errorData,
      requiresKey: [400, 401, 403, 429].includes(status) // Flag to tell frontend to ask for key
    });
  }
});

// Endpoint to update .env file
app.post('/api/update-env', async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    // 1. Update process.env immediately for current session
    process.env[key] = value;

    // 2. Update .env file for persistence
    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Check if key exists and replace/append
    const regex = new RegExp(`^${key}\\s*=.*`, 'gm');

    if (regex.test(envContent)) {
      // Replace all occurrences to avoid duplicates
      envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
      // Append if not found
      envContent = envContent.trim() + `\n${key}="${value}"`;
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log(`✅ Updated .env file: ${key}="${value.substring(0, 5)}..."`);

    res.json({ success: true, message: 'Environment variable updated' });

  } catch (error) {
    console.error('❌ Error updating .env:', error);
    res.status(500).json({ error: 'Failed to update environment variable' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`POST http://localhost:${PORT}/api/send-signin-email`);
  console.log(`POST http://localhost:${PORT}/api/send-signup-email`);
  console.log(`POST http://localhost:${PORT}/api/send-digest-email`);
  console.log(`⏰ Scheduled digest job initialized`);

  // Test Supabase connection
  console.log('\n🧪 Testing Supabase connection...');
  try {
    const { data, error, count } = await supabase
      .from('email_digest_preferences')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('❌ Supabase test query failed:', error);
    } else {
      console.log(`✅ Supabase connection OK. Found ${count} total rows in email_digest_preferences`);
      if (data && data.length > 0) {
        console.log('   Sample row:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.error('❌ Supabase test error:', err);
  }
  console.log('');
});
