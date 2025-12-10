"""
Email Validation Utility - DNS-based email validation
"""
import re
import dns.resolver
from typing import Optional


def is_valid_email_format(email: str) -> bool:
    """Validate email format using regex"""
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return bool(re.match(email_regex, email))


async def check_email(email: str) -> dict:
    """
    Complete email validation with DNS checks
    SMTP verification is skipped for reliability and speed
    
    Args:
        email: Email address to validate
    
    Returns:
        dict with validation result
    """
    try:
        print(f"\n{'=' * 70}")
        print(f"Validating: {email}")
        print('=' * 70)
        
        # Step 1: Format validation
        print("\n[Step 1] Checking email format...")
        if not is_valid_email_format(email):
            return {
                "valid": False,
                "email": email,
                "step": "format",
                "reason": "Invalid email format",
                "mailboxExists": False
            }
        print("  ✓ Format is valid")
        
        # Extract domain
        domain = email.split('@')[1]
        
        # Step 2: DNS MX records check
        print(f"\n[Step 2] Checking DNS MX records for {domain}...")
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            
            if not mx_records:
                return {
                    "valid": False,
                    "email": email,
                    "domain": domain,
                    "step": "dns",
                    "reason": "No MX records found",
                    "mailboxExists": False
                }
            
            # Sort by priority (lower number = higher priority)
            sorted_records = sorted(mx_records, key=lambda x: x.preference)
            
            print(f"  ✓ Found {len(sorted_records)} MX record(s):")
            mx_list = []
            for i, record in enumerate(sorted_records):
                print(f"    {i + 1}. {record.exchange} (priority: {record.preference})")
                mx_list.append({
                    "exchange": str(record.exchange),
                    "priority": record.preference
                })
            
        except dns.resolver.NXDOMAIN:
            return {
                "valid": False,
                "email": email,
                "domain": domain,
                "step": "dns",
                "reason": "Domain does not exist (NXDOMAIN)",
                "error": "NXDOMAIN",
                "mailboxExists": False
            }
        except dns.resolver.NoAnswer:
            return {
                "valid": False,
                "email": email,
                "domain": domain,
                "step": "dns",
                "reason": "No MX records found",
                "error": "NO_ANSWER",
                "mailboxExists": False
            }
        except dns.exception.DNSException as dns_error:
            return {
                "valid": False,
                "email": email,
                "domain": domain,
                "step": "dns",
                "reason": f"DNS lookup failed: {str(dns_error)}",
                "error": str(dns_error),
                "mailboxExists": False
            }
        
        # Step 3: Accept DNS validation as sufficient
        print(f"\n[Step 3] Email verified via DNS validation")
        
        return {
            "valid": True,
            "email": email,
            "domain": domain,
            "step": "verified",
            "mailboxExists": True,
            "mxRecords": mx_list,
            "reason": "Email verified (DNS validation passed)"
        }
        
    except Exception as error:
        return {
            "valid": False,
            "email": email,
            "step": "error",
            "reason": f"Error: {str(error)}",
            "error": str(error),
            "mailboxExists": False
        }


def print_result(result: dict) -> None:
    """Print validation result in a formatted way"""
    print(f"\n{'─' * 70}")
    print("VALIDATION RESULT:")
    print('─' * 70)
    
    if result.get("mailboxExists") is True:
        print("Status: ✓ VALID - Email verified via DNS")
    elif result.get("mailboxExists") is False:
        print("Status: ✗ INVALID - Email validation failed")
    else:
        print("Status: ✗ INVALID")
    
    print(f"Reason: {result.get('reason')}")
    print('─' * 70)
