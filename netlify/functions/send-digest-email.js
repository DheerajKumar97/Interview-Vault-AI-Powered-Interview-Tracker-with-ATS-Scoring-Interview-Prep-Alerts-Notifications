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
        const { email, userId, frequency, dashboardImage, dashboardPdf } = JSON.parse(event.body || '{}');

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email is required' })
            };
        }

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('❌ Missing SMTP credentials');
            console.error('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
            console.error('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server misconfiguration: Missing SMTP credentials' })
            };
        }

        console.log('📧 Sending Email Digest to:', email);
        console.log('📋 Frequency:', frequency);

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

        console.log('📎 Attachments count:', attachments.length);

        const mailOptions = {
            from: process.env.SMTP_EMAIL || 'interviewvault2026@gmail.com',
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
                    <img src="https://raw.githubusercontent.com/DheerajKumar97/Interview-Vault-BI-Powered-Interview-Tracker-with-ATS-Score-Calculation-Alerts-and-Nofitication/main/public/logo.png" alt="Interview Vault" class="logo">
                    <h1>📊 Your ${frequencyLabels[frequency] || 'Scheduled'} Digest</h1>
                    <p style="margin-top: 10px; opacity: 0.95; font-size: 16px;">Application Tracking Summary</p>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>Here's your ${frequencyLabels[frequency] ? frequencyLabels[frequency].toLowerCase() : 'scheduled'} summary of your interview applications in <strong>Interview Vault</strong>.</p>
                    
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
                        <a href="${process.env.FRONTEND_URL || 'https://interview-compass.netlify.app'}/dashboard" class="btn">View Full Dashboard</a>
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

        // Send email
        console.log('🔧 Creating email transporter...');
        const transporter = createTransporter();

        console.log('📤 Sending email via nodemailer...');
        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Email Digest sent successfully!');
        console.log('📬 Message ID:', info.messageId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                messageId: info.messageId,
                message: 'Email digest sent successfully',
            })
        };
    } catch (error) {
        console.error('❌ Error sending email digest:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to send email digest',
                message: error.message,
                errorName: error.name,
                stack: error.stack,
                details: error.toString()
            })
        };
    }
};
