/**
 */
import { API_BASE_URL } from '../config/api';
export const sendSignUpEmail = async (email: string, fullName: string) => {
  try {
    console.log('📧 Sending Sign Up email to:', email);

    const response = await fetch(`${API_BASE_URL}/send-signup-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        fullName: fullName,
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Email service returned non-OK status:', response.status);
      return { success: false, error: 'Email service unavailable' };
    }

    const result = await response.json();
    console.log('✅ Sign Up email sent successfully');
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.warn('⚠️ Email service unavailable:', error?.message);
    return { success: false, error: error?.message || 'Unknown error' };
  }
};

/**
 * Send Sign In (Login Alert) Email
 * @param {string} email - User email
 * @param {string} fullName - User full name (optional)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendSignInEmail = async (email: string, fullName: string = '') => {
  try {
    console.log('📧 Sending Sign In email to:', email);

    // Get browser info
    const browserInfo = getBrowserInfo();

    // Get IP address (if available from browser)
    const ipAddress = await getClientIP();

    const response = await fetch(`${API_BASE_URL}/send-signin-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        fullName: fullName,
        loginTime: new Date().toLocaleString(),
        browserInfo: browserInfo,
        ipAddress: ipAddress,
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Email service returned non-OK status:', response.status);
      return { success: false, error: 'Email service unavailable' };
    }

    const result = await response.json();
    console.log('✅ Sign In email sent successfully');
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.warn('⚠️ Email service unavailable:', error?.message);
    return { success: false, error: error?.message || 'Unknown error' };
  }
};

/**
 * Get browser information
 * @returns {string} Browser and OS info
 */
function getBrowserInfo(): string {
  const userAgent = navigator.userAgent;

  // Detect browser
  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // Detect OS
  let os = 'Unknown OS';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'Mac';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad'))
    os = 'iOS';

  return `${browser} on ${os}`;
}

/**
 * Get client IP address
 * Uses free IP geolocation API
 * @returns {Promise<string>} IP address
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'Not Available';
  } catch (error) {
    console.warn('⚠️ Could not fetch IP address:', error);
    return 'Not Available';
  }
}

/**
 * Verify email service is working (for testing)
 * @returns {Promise<boolean>} Service status
 */
export const verifyEmailService = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/send-signin-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    if (!response.ok) {
      throw new Error('Email service verification failed');
    }

    console.log('✅ Email service verified');
    return true;
  } catch (error) {
    console.warn('⚠️ Email service verification failed:', error);
    return false;
  }
};

export default {
  sendSignUpEmail,
  sendSignInEmail,
  verifyEmailService,
};
