# Security Policy

## 🔒 Reporting Security Vulnerabilities

If you discover a security vulnerability in Budget App, please help us keep the app secure by reporting it responsibly.

### ⚠️ Please DO NOT:
- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### ✅ Please DO:
1. **Report privately** - Use GitHub's [Security Advisories](https://github.com/codescribblr/budget-app/security/advisories/new) feature to report the vulnerability privately
2. **Provide details** - Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (if you have them)
3. **Allow time for a fix** - We'll work to address the issue as quickly as possible and will keep you updated on progress

## 🛡️ Security Best Practices

Budget App follows these security practices:

- **Authentication** - Uses Supabase Auth with secure session management
- **Database Security** - Row Level Security (RLS) policies protect user data
- **Environment Variables** - Sensitive credentials are never committed to the repository
- **HTTPS** - All production traffic is encrypted via HTTPS
- **Input Validation** - User inputs are validated and sanitized
- **Dependencies** - Regular updates to address known vulnerabilities

## 🔐 Data Privacy

- **User Data** - All user data is isolated using Row Level Security
- **No Tracking** - We don't use analytics or tracking scripts
- **Local First** - Your financial data stays in your Supabase instance
- **No Sharing** - We never share or sell user data

## 📋 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Yes             |
| Older   | ❌ No              |

We only support the latest version deployed to production. Please ensure you're using the current version before reporting issues.

## 🙏 Thank You

We appreciate your help in keeping Budget App secure. Responsible disclosure helps protect all users.

