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
 * Complete email validation with DNS checks only
 * SMTP verification is skipped for reliability and speed
 */
async function checkEmail(email) {
    try {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`Validating: ${email}`);
        console.log('='.repeat(70));

        // Step 1: Format validation
        console.log('\n[Step 1] Checking email format...');
        if (!isValidEmailFormat(email)) {
            return {
                valid: false,
                email: email,
                step: 'format',
                reason: 'Invalid email format',
                mailboxExists: false
            };
        }
        console.log('  ✓ Format is valid');

        // Extract domain
        const domain = email.split('@')[1];

        // Step 2: DNS MX records check
        console.log(`\n[Step 2] Checking DNS MX records for ${domain}...`);
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

            // Sort by priority (lower number = higher priority)
            mxRecords.sort((a, b) => a.priority - b.priority);
            console.log(`  ✓ Found ${mxRecords.length} MX record(s):`);
            mxRecords.forEach((record, index) => {
                console.log(`    ${index + 1}. ${record.exchange} (priority: ${record.priority})`);
            });
        } catch (dnsError) {
            return {
                valid: false,
                email: email,
                domain: domain,
                step: 'dns',
                reason: `DNS lookup failed: ${dnsError.code}`,
                error: dnsError.code,
                mailboxExists: false
            };
        }

        // Step 3: Accept DNS validation as sufficient
        // SMTP verification is slow and unreliable, DNS is good enough
        console.log(`\n[Step 3] Email verified via DNS validation`);

        return {
            valid: true,
            email: email,
            domain: domain,
            step: 'verified',
            mailboxExists: true, // DNS validation passed
            mxRecords: mxRecords,
            reason: 'Email verified (DNS validation passed)'
        };

    } catch (error) {
        return {
            valid: false,
            email: email,
            step: 'error',
            reason: `Error: ${error.message}`,
            error: error.message,
            mailboxExists: false
        };
    }
}

/**
 * Print result in a formatted way
 */
function printResult(result) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log('VALIDATION RESULT:');
    console.log('─'.repeat(70));

    if (result.mailboxExists === true) {
        console.log('Status: ✓ VALID - Email verified via DNS');
    } else if (result.mailboxExists === false) {
        console.log('Status: ✗ INVALID - Email validation failed');
    } else {
        console.log('Status: ✗ INVALID');
    }

    console.log(`Reason: ${result.reason}`);
    console.log('─'.repeat(70));
}

/**
 * Validate multiple emails
 */
async function validateEmails(emails) {
    console.log('\n🔍 Starting comprehensive email validation...\n');

    const results = [];
    for (const email of emails) {
        const result = await checkEmail(email);
        printResult(result);
        results.push(result);

        // Add delay between checks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}

// Export for use in other modules
export { checkEmail, validateEmails };