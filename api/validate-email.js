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
        }, 10000);

        client.on('data', (data) => {
            response = data.toString();

            try {
                if (step === 0 && response.includes('220')) {
                    step = 1;
                    client.write('EHLO example.com\r\n');
                } else if (step === 1 && (response.includes('250') || response.includes('220'))) {
                    step = 2;
                    client.write('MAIL FROM:<verify@example.com>\r\n');
                } else if (step === 2 && response.includes('250')) {
                    step = 3;
                    client.write(`RCPT TO:<${email}>\r\n`);
                } else if (step === 3) {
                    clearTimeout(timeout);
                    client.write('QUIT\r\n');
                    client.end();

                    if (response.includes('250')) {
                        resolve({ exists: true, reason: 'Mailbox exists', smtpResponse: response.trim() });
                    } else if (response.includes('550') || response.includes('551') || response.includes('553')) {
                        resolve({ exists: false, reason: 'Mailbox does not exist', smtpResponse: response.trim() });
                    } else if (response.includes('450') || response.includes('451') || response.includes('452')) {
                        resolve({ exists: 'unknown', reason: 'Temporary error', smtpResponse: response.trim() });
                    } else {
                        resolve({ exists: 'unknown', reason: 'Server response unclear', smtpResponse: response.trim() });
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
export async function validateEmail(email) {
    try {
        // Step 1: Format validation
        if (!isValidEmailFormat(email)) {
            return {
                valid: false,
                email: email,
                step: 'format',
                reason: 'Invalid email format',
                mailboxExists: false
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
                    reason: 'No MX records found',
                    mailboxExists: false
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
                mailboxExists: false
            };
        }

        // Step 3: SMTP verification
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

    } catch (error) {
        return {
            valid: false,
            email: email,
            step: 'error',
            reason: `Error: ${error.message}`,
            mailboxExists: false
        };
    }
}

// API Handler for HTTP requests
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const result = await validateEmail(email);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            error: 'Validation failed',
            message: error.message
        });
    }
}
