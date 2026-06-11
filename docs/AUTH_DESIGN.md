# Authentication Design

## Overview

The system uses **passwordless email OTP authentication**. There are no passwords to manage, hash, or leak. The owner receives a one-time code via email and exchanges it for a short-lived access token and a long-lived refresh token.

---

## Authentication Flow

```
1. User enters email address
        │
        ▼
2. Backend: validate email format
   → Generate 6-digit OTP via crypto.randomInt()
   → Hash OTP with argon2
   → Store hash in `otps` table (expires in 5 min, attempts = 0)
   → Send plaintext OTP via email service (Resend)
        │
        ▼
3. User enters OTP on verification screen
        │
        ▼
4. Backend: find unexpired, unused OTP for email
   → If not found: return "invalid or expired OTP"
   → Increment attempts counter
   → If attempts >= 5: invalidate OTP, return "too many attempts"
   → Verify argon2 hash
   → If mismatch: return "invalid OTP"
   → Mark OTP as used
        │
        ▼
5. Backend: issue tokens
   → Create access token (JWT, 7 day expiry)
   → Create refresh token (random secure bytes, 7 day expiry)
   → Hash refresh token, store in `sessions` table
   → Send access token in response body
   → Send refresh token as HttpOnly Secure cookie
        │
        ▼
6. User is authenticated
   → Access token sent in Authorization header on every request
   → Access token refreshed silently via /auth/refresh before expiry
```

---

## Token Design

### Access Token (JWT)

```json
{
  "sub": "user-uuid",
  "email": "owner@store.com",
  "role": "OWNER",
  "iat": 1234567890,
  "exp": 1234568790
}
```

- Signed with `HS256` using a secret from environment variables
- Expiry: **7 days**
- Sent in `Authorization: Bearer <token>` header
- Never stored in localStorage — kept in memory (React state or TanStack Query cache)

### Refresh Token

- A cryptographically random 64-byte string (`crypto.randomBytes(64).toString('hex')`)
- Stored as an argon2 hash in the `sessions` table
- Expiry: **7 days**
- Sent and stored as an `HttpOnly; Secure; SameSite=Strict` cookie
- This prevents JavaScript from accessing it (XSS protection)

---

## API Endpoints

```
POST /auth/request-otp
Body: { email: string }
Response: { message: "OTP sent" }
Rate limit: 3 requests per email per 15 minutes

POST /auth/verify-otp
Body: { email: string, otp: string }
Response: { accessToken: string, user: { id, email, role } }
Sets: HttpOnly cookie with refresh token

POST /auth/refresh
Cookie: refresh token (automatic)
Response: { accessToken: string }

POST /auth/logout
Cookie: refresh token (automatic)
Response: { message: "Logged out" }
Action: marks session as revoked in DB
```

---

## Security Measures

| Threat | Mitigation |
|---|---|
| OTP brute force | Max 5 attempts per OTP; OTP invalidated after failure threshold |
| OTP enumeration | Same response shape for "invalid" and "expired" OTPs |
| Replay attacks | OTP marked `used = true` immediately on first successful verification |
| Refresh token theft | Stored as HttpOnly cookie, never accessible to JavaScript |
| JWT tampering | Signature validated on every request via middleware |
| Stale sessions | Refresh tokens tracked in DB; logout revokes the session immediately |
| OTP spam | Rate limit: 3 OTP requests per email per 15 minutes |
| Expired OTPs lingering | Scheduled cleanup job deletes expired OTPs older than 24 hours |

---

## Middleware

Every protected route passes through `authenticate` middleware:

```
Request → authenticate middleware
  → Extract Bearer token from Authorization header
  → Verify JWT signature and expiry
  → Attach user payload to req.user
  → Call next()
  
  On failure → 401 Unauthorized
```

---

## Future Extensibility

- The `role` field on `users` is already in the JWT. Adding a new role (e.g., `STAFF`) requires no schema changes — just add logic to the `authorize(roles)` middleware.
- Multiple users can be supported by adding a user management UI. The auth flow itself already supports multiple emails.
- Social login (Google OAuth) could be added as an alternative to OTP without removing it — the session + JWT layer is provider-agnostic.
