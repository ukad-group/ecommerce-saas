# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please contact us directly:

- **Email**: hi@ukad-group.com
- **Subject**: [SECURITY] eCommerce SaaS Platform Vulnerability

### What to Include

When reporting a vulnerability, please include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested fixes (optional)

## Security Considerations

### Current Implementation Notes

This project is designed as a **starter template** for eCommerce applications. Before deploying to production, please review:

1. **Authentication**: The current JWT implementation uses a hardcoded secret key. Generate a strong, unique secret for production.

2. **Database**: SQLite is used for development. For production, migrate to SQLServer or PostgreSQL with proper security configurations.

3. **API Keys**: API keys in seed data are for demonstration only. Generate new keys for any real deployments.

4. **CORS**: The current CORS configuration allows localhost origins. Restrict to your actual domains in production.

5. **HTTPS**: Always use HTTPS in production environments.

6. **Input Validation**: While basic validation exists, review and enhance for your specific use case.

7. **Rate Limiting**: Not currently implemented. Add rate limiting before production deployment.

### Passwords in Seed Data

The seed data includes test users with the password `password123`. This is intentionally simple for development purposes. In production:

- Remove or change all seed user accounts
- Implement proper password policies
- Consider integrating with OAuth2/OIDC providers

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Contact

**UKAD**
- Website: https://ukad-group.com
- Email: hi@ukad-group.com
