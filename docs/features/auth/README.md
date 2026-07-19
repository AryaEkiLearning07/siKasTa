# Authentication

## Purpose

Fitur authentication mengatur login, logout, session cookie, validasi role, dan redirect user ke dashboard sesuai role.

## Main Entry Points

- UI: `src/app/login/page.tsx`
- API login: `src/app/api/auth/login/route.ts`
- API logout: `src/app/api/auth/logout/route.ts`
- API current user: `src/app/api/auth/me/route.ts`
- Use case: `src/features/auth/application/loginUseCase.ts`
- Infrastructure session: `src/lib/auth.ts`
- Password hashing: `src/lib/password.ts`

## Data Model Ownership

- `User`: identity, role, optional `classId`.
- `Session`: server-side session row with expiration.
- `AuditLog`: login success and failed login attempts.

## Business Rules

- Login requires username and password.
- Maintenance mode blocks login before credential validation.
- Invalid credentials return the same public message for username or password mismatch.
- Successful login creates a server-side session and HTTP-only cookie.
- Password hashes can be upgraded after successful login when `PASSWORD_HASH_ROUNDS` changes.

## Security Notes

- Cookie is HTTP-only.
- Cookie `secure` flag is enabled only in production.
- Failed and successful logins are audited.
- Do not expose password hash in API responses.

## Extension Checklist

- Add rate limiting before public deployment.
- Keep failed login messages generic.
- Add tests for maintenance mode, invalid credentials, and hash upgrade path.
- If adding MFA, keep MFA verification in `features/auth/application`.
