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

// Signup email HTML template
const getSignUpEmailHTML = (variables) => {
  return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 30px; }
        .features { background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0; }
        .feature-item { display: flex; margin: 10px 0; }
        .feature-icon { margin-right: 10px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; margin: 20px 0; font-weight: bold; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        h2 { color: #333; }
        p { color: #555; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to Interview Vault!</h1>
            <p>Your interview tracking journey starts now</p>
        </div>
        <div class="content">
            <p>Hi ${variables.fullName},</p>
            
            <p>Thank you for joining Interview Vault! We're excited to help you track, manage, and visualize your entire job search journey.</p>
            
            <h2>What You Can Do:</h2>
            <div class="features">
                <div class="feature-item">
                    <span class="feature-icon">✓</span>
                    <span><strong>Track Applications:</strong> Monitor all your job applications in one place</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">✓</span>
                    <span><strong>Schedule Interviews:</strong> Keep track of interview dates and times</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">✓</span>
                    <span><strong>View Analytics:</strong> Get insights into your application success rates</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">✓</span>
                    <span><strong>Manage Events:</strong> Add follow-ups, offers, rejections, and more</span>
                </div>
                <div class="feature-item">
                    <span class="feature-icon">✓</span>
                    <span><strong>Export Data:</strong> Download your records as Excel or CSV</span>
                </div>
            </div>
            
            <p style="text-align: center;">
                <a href="${variables.dashboardURL}" class="btn">Start Tracking Now</a>
            </p>
            
            <h2>Need Help?</h2>
            <p>Check out our documentation or contact support at support@interviewvault.com</p>
            
            <p>Happy tracking!<br>The Interview Vault Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Interview Vault. All rights reserved.</p>
            <p>Securely track your job applications and interview progress</p>
        </div>
    </div>
</body>
</html>`;
};

// Main handler
export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, fullName } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ Missing SMTP credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server misconfiguration: Missing SMTP credentials' })
      };
    }

    console.log('📧 Sending Sign Up email to:', email);

    const variables = {
      fullName: fullName || 'User',
      email: email,
      dashboardURL: `${process.env.FRONTEND_URL || 'https://interview-compass.netlify.app'}/applications`,
    };

    const htmlContent = getSignUpEmailHTML(variables);

    // Send email
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: 'interviewvault2026@gmail.com',
      to: email,
      subject: '🎉 Welcome to Interview Vault!',
      html: htmlContent,
    });

    console.log('✅ Sign Up email sent:', info.messageId);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageId: info.messageId,
        message: 'Welcome email sent successfully',
      })
    };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send email',
        message: error.message,
      })
    };
  }
};
