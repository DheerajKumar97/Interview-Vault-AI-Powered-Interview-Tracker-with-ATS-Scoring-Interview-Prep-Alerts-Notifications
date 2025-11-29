import nodemailer from 'nodemailer';

// Create transporter with Gmail (using App Password)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};



// Signin email HTML template
const getSignInEmailHTML = (variables) => {
  return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .alert-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .info-row { display: flex; margin: 10px 0; }
        .info-label { font-weight: bold; width: 150px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 New Login Detected</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>We detected a new login to your Interview Vault account.</p>
            
            <div class="alert-box">
                <strong>⚠️ Security Alert:</strong> If this wasn't you, please change your password immediately.
            </div>
            
            <h3>Login Details:</h3>
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span>${variables.email}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Time:</span>
                <span>${variables.loginTime}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Browser:</span>
                <span>${variables.browserInfo}</span>
            </div>
            <div class="info-row">
                <span class="info-label">IP Address:</span>
                <span>${variables.ipAddress}</span>
            </div>
            
            <p style="margin-top: 30px;">
                <a href="${variables.resetPasswordURL}" class="btn">Reset Password</a>
            </p>
            
            <p>Questions? Contact us at support@interviewvault.com</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Interview Vault. All rights reserved.</p>
            <p><a href="${variables.privacyURL}">Privacy Policy</a> | <a href="${variables.settingsURL}">Account Settings</a></p>
        </div>
    </div>
</body>
</html>`;
};

// Main handler
export default async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, loginTime, browserInfo, ipAddress } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Sending Sign In email to:', email);

    const variables = {
      email: email,
      loginTime: loginTime || new Date().toLocaleString(),
      browserInfo: browserInfo || 'Unknown',
      ipAddress: ipAddress || 'Not Available',
      resetPasswordURL: `${process.env.FRONTEND_URL || 'https://interview-compass.netlify.app'}/auth/forgot-password`,
      privacyURL: `${process.env.FRONTEND_URL || 'https://interview-compass.netlify.app'}/privacy`,
      settingsURL: `${process.env.FRONTEND_URL || 'https://interview-compass.netlify.app'}/settings`,
    };

    const htmlContent = getSignInEmailHTML(variables);

    // Send email
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_EMAIL || 'interviewvault.2026@gmail.com',
      to: email,
      subject: '🔐 New Login to Interview Vault',
      html: htmlContent,
    });

    console.log('✅ Sign In email sent:', info.messageId);
    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Sign in email sent successfully',
    });
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
    });
  }
};
