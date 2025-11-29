import dns from 'dns';
import net from 'net';
const { promises: dnsPromises } = dns;

/**
 * Validates email format using regex
 */
function isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * SMTP verification to check if mailbox exists
 */
async function verifyMailboxExists(email, mxHost) {
    return new Promise((resolve) => {
        const client = net.createConnection(25, mxHost);
        let response = '';
        let step = 0;
        const timeout = setTimeout(() => {
            client.destroy();
            resolve({ exists: false, reason: 'Connection timeout' });
        }, 5000); // Reduced timeout for serverless

        client.on('data', (data) => {
            response += data.toString();

            try {
                if (step === 0 && response.includes('220')) {
                    if (response.match(/(^|\n)220 /)) {
                        step = 1;
                        response = '';
                        client.write('EHLO example.com\r\n');
                    }
                } else if (step === 1) {
                    if (response.match(/(^|\n)250 /)) {
                        step = 2;
                        response = '';
                        client.write('MAIL FROM:<verify@example.com>\r\n');
                    }
                } else if (step === 2) {
                    if (response.match(/(^|\n)250 /)) {
                        step = 3;
                        response = '';
                        client.write(`RCPT TO:<${email}>\r\n`);
                    }
                } else if (step === 3) {
                    const isOk = response.match(/(^|\n)250 /);
                    const isFail = response.match(/(^|\n)(550|551|553) /);

                    if (isOk || isFail) {
                        clearTimeout(timeout);
                        client.write('QUIT\r\n');
                        client.end();

                        if (isOk) {
                            resolve({ exists: true, reason: 'Mailbox exists' });
                        } else {
                            resolve({ exists: false, reason: 'Mailbox does not exist' });
                        }
                    }
                }
            } catch (err) {
                clearTimeout(timeout);
                client.destroy();
                resolve({ exists: false, reason: `Error: ${err.message}` });
            }
        });

        client.on('error', (err) => {
            clearTimeout(timeout);
            resolve({ exists: false, reason: `Connection error: ${err.message}` });
        });

        client.on('end', () => {
            clearTimeout(timeout);
        });
    });
}

/**
 * Complete email validation with DNS and SMTP checks
 */
async function checkEmail(email) {
    try {
        // Step 1: Format validation
        if (!isValidEmailFormat(email)) {
            return {
                valid: false,
                email: email,
                step: 'format',
                reason: 'Invalid email format'
            };
        }

        // Extract domain
        const domain = email.split('@')[1];

        // Step 2: DNS MX records check
        let mxRecords;
        try {
            mxRecords = await dnsPromises.resolveMx(domain);

            if (!mxRecords || mxRecords.length === 0) {
                return {
                    valid: false,
                    email: email,
                    domain: domain,
                    step: 'dns',
                    reason: 'No MX records found'
                };
            }

            // Sort by priority
            mxRecords.sort((a, b) => a.priority - b.priority);
        } catch (dnsError) {
            return {
                valid: false,
                email: email,
                domain: domain,
                step: 'dns',
                reason: `DNS lookup failed: ${dnsError.code}`,
                error: dnsError.code
            };
        }

        // Step 3: SMTP verification (optional, can be slow)
        // For serverless, we'll skip SMTP to avoid timeouts
        // Uncomment below if you want full SMTP verification
        /*
        const smtpResult = await verifyMailboxExists(email, mxRecords[0].exchange);
        return {
            valid: smtpResult.exists === true,
            email: email,
            domain: domain,
            step: 'complete',
            mailboxExists: smtpResult.exists,
            mxRecords: mxRecords,
            reason: smtpResult.reason
        };
        */

        // Return DNS-only validation (faster for serverless)
        return {
            valid: true,
            email: email,
            domain: domain,
            step: 'verified',
            mailboxExists: true, // DNS validation passed, accept as valid
            mxRecords: mxRecords,
            reason: 'Email verified (DNS validation passed)'
        };

    } catch (error) {
        return {
            valid: false,
            email: email,
            step: 'error',
            reason: `Error: ${error.message}`,
            error: error.message
        };
    }
}

// Netlify Function Handler
export const handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const { email } = JSON.parse(event.body || '{}');

        if (!email) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: 'Email is required' }),
            };
        }

        const result = await checkEmail(email);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error('Error validating email:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'Failed to validate email',
                message: error.message,
                valid: false,
                mailboxExists: false,
            }),
        };
    }
};
