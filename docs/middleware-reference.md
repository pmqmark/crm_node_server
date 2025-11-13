# Middleware Reference – CRM Node Server

_Date: 2025-11-10_

This guide explains the middleware utilities defined in `src/middleware/`. It clarifies how JWT authentication, role authorisation, and token generation work together across the API.

---

## 1. Summary Table

| Middleware / Helper                           | File                 | Responsibility                                            |
| --------------------------------------------- | -------------------- | --------------------------------------------------------- |
| `authMiddleware`                              | `verifyToken.ts`     | Verify access tokens, attach authenticated user to `req`. |
| `roleGuard`                                   | `roleguard.ts`       | Enforce role-based access for protected routes.           |
| `generateAccessToken`, `generateRefreshToken` | `tokenMiddleware.ts` | Sign JWTs with consistent payloads and expiry windows.    |

These components are typically wired like:

```ts
router.use(authMiddleware);
router.use(roleGuard(["Admin"]));
```

---

## 2. `authMiddleware`

**Location:** `src/middleware/verifyToken.ts`

### Responsibilities

- Reads the `Authorization` header (expects `Bearer <token>` format).
- Validates the token using `process.env.ACCESS_TOKEN_SECRET` through `jwt.verify`.
- Ensures the decoded payload contains `id`, `email`, `role`, `iat`, `exp`.
- Populates `req.user` with `{ id, email, role }` for downstream handlers.
- Sends an HTTP response when verification fails:
  - `401` if the header or token is missing.
  - `401` for invalid/expired tokens (`JsonWebTokenError`).
  - `500` for unexpected errors (e.g., missing secret).

### Why it matters

Controllers and other middleware rely on `req.user` to identify who is calling and what they are allowed to do; `authMiddleware` guarantees that information is present and trustworthy.

---

## 3. `roleGuard`

**Location:** `src/middleware/roleguard.ts`

### Responsibilities

- Factory function `roleGuard(allowedRoles)` returns middleware enforcing role checks.
- Confirms `req.user` exists (assumes `authMiddleware` already ran).
- Supports both single-role strings and arrays (e.g. `roleGuard("Admin")` or `roleGuard(["Admin", "Employee"])`).
- Handles users with multiple roles (array) or single role (string).
- Responds with `403` and message `Forbidden: Insufficient permissions` when the caller lacks the required role.

### Why it matters

Keeps authorisation policy near the routes and avoids scattering manual role checks inside controllers.

---

## 4. Token Helpers (`tokenMiddleware.ts`)

**Location:** `src/middleware/tokenMiddleware.ts`

### Exports

- `generateAccessToken(userInfo)` – Signs payload using `ACCESS_TOKEN_SECRET` with `expiresIn: "1d"`.
- `generateRefreshToken(userInfo)` – Signs payload using `REFRESH_TOKEN_SECRET` with `expiresIn: "7d"`.
- `expiryAccessToken`, `expiryRefreshToken` – Expose the default TTL strings.

### Usage Flow

1. After a successful login/refresh, controllers call these helpers with a `validitatedUser` DTO (includes `id`, `email`, `role`).
2. Access token goes into the `Authorization` header for subsequent requests.
3. Refresh token is stored client-side and exchanged via `/api/auth/regenerate-tokens` to obtain new tokens.

### Why it matters

Centralises JWT signing logic so expiry settings and secrets remain consistent across the codebase.

---

## 5. Typical Middleware Chain

```
Incoming Request
  ↓
Express global middleware (CORS, cookies, body parsers)
  ↓
`authMiddleware` (validate JWT, populate `req.user`)
  ↓
`roleGuard([...])` (authorise role)
  ↓
Controller handler
```

- Public routes (login, token refresh) skip `authMiddleware` and `roleGuard` entirely.
- Admin, employee, and client routers mount the guards via `router.use(...)` so every nested route shares the same protections.

---

Prepared by: GitHub Copilot (AI Assistant)
