# Estim AI Platform - Authentication Documentation

## 1. Authentication Overview

The Estim AI Platform uses JWT (JSON Web Token) based authentication with a short-lived access token and a longer-lived refresh token.

### 1.1 Flow Summary

```text
1. User enters credentials → POST /auth/login
2. Server verifies credentials → Issues JWT tokens
3. Client stores tokens
4. Subsequent requests include Authorization header
5. Token expires → POST /auth/refresh
6. Refresh token valid → New access token issued
7. Refresh token expired → Re-login required
```

## 2. Token Types

### 2.1 Access Token

| Property | Value |
|----------|-------|
| Format | JWT (HS256) |
| Expiration | 15 minutes |
| Storage | HTTP-only cookie or secure storage |
| Usage | Include in `Authorization: Bearer <token>` header |
| Purpose | Authenticate API requests |

### 2.2 Refresh Token

| Property | Value |
|----------|-------|
| Format | Opaque string |
| Expiration | 7 days |
| Storage | Secure storage (not in localStorage) |
| Usage | POST to `/auth/refresh` |
| Purpose | Obtain new access tokens |

## 3. Login Flow

### 3.1 Request

```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "secret123"
}
```

### 3.2 Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlbnRfc2VuZF90b2tlbi10ZXN0...",
    "token_type": "bearer",
    "expires_in": 900
  },
  "meta": {
    "timestamp": "2026-10-19T10:00:00Z"
  }
}
```

### 3.3 Error Response

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials",
    "request_id": "uuid-here"
  }
}
```

## 4. Protected Endpoints

All protected endpoints require:

```http
GET /api/v1/any-endpoint HTTP/1.1
Authorization: Bearer <access_token>
```

### 4.1 Token Validation

The auth middleware validates tokens:

1. Extract token from `Authorization` header
2. Verify JWT signature
3. Check expiration
4. Load user from database
5. Check role/permissions
6. Attach user to request context

### 4.2 Token Refresh

```http
POST /auth/refresh HTTP/1.1
Content-Type: application/json

{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlbnRfc2VuZF90b2tlbi10ZXN0...",
  "token_type": "bearer"
}
```

**Response:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 900
  },
  "meta": {
    "timestamp": "2026-10-19T10:00:00Z"
  }
}
```

### 4.3 Logout

```http
POST /auth/logout HTTP/1.1
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "data": {
    "message": "Logged out successfully"
  },
  "meta": {
    "timestamp": "2026-10-19T10:00:00Z"
  }
}
```

## 5. Role-Based Access Control

### 5.1 Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access to all modules |
| `manager` | Access to owned companies, limited admin |
| `staff` | Read access to own data, view-only for others |

### 5.2 Permission Checks

Middleware checks permissions for each protected endpoint:

1. Verify token is valid
2. Load user from database
3. Check role-based permissions
4. Check module-specific access
5. Deny access if any check fails

## 6. Security Considerations

### 6.1 Best Practices

| Practice | Description |
|----------|-------------|
| HTTPS | Always use HTTPS in production |
| Token storage | Store access tokens in secure storage |
| Refresh token | Never expose refresh token |
| JWT algorithm | Use HS256 (not RS256 for simplicity) |
| Secret key | Use strong, random secret key in production |

### 6.2 Common Vulnerabilities

| Vulnerability | Mitigation |
|---------------|------------|
| Token leakage | Secure storage, HTTPS only |
| XSS attacks | No token in localStorage |
| Replay attacks | Short-lived tokens (15 min) |
| Brute force | Rate limiting on login endpoint |

## 7. Configuration

### 7.1 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET_KEY` | Secret key for JWT signing | Required |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry | `15` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiry | `7` |
| `JWT_TOKEN_PREFIX` | Authorization header prefix | `Bearer` |

## 8. Related Documentation

- [API Reference](00-api-reference.md)
- [Error Codes](02-error-codes.md)
