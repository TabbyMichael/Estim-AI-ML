# Estim AI Platform - API Reference

## 1. API Overview

The Estim AI Platform exposes a RESTful API built with FastAPI. All endpoints are versioned under `/api/v1`.

### 1.1 Base URL

```
http://localhost:8000/api/v1
```

### 1.2 Versioning

- Current version: `v1`
- Breaking changes will result in new versions (`v2`, etc.)
- Old versions supported for 6 months after new version release

### 1.3 Content Type

All requests and responses use `application/json`.

### 1.4 Authentication

All endpoints except `/auth/login` require authentication. Include the JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Refresh tokens are used to obtain new access tokens without re-authentication.

## 2. Endpoint Summary

| Endpoint Group | Purpose | Auth Required |
|----------------|---------|---------------|
| `/auth/*` | Authentication | No |
| `/users/*` | User management | Yes (admin) |
| `/identity/*` | Core identity data | Yes |
| `/procurement/*` | Procurement & invoices | Yes |
| `/cost-forecasting/*` | Budget & forecasts | Yes |
| `/inventory/*` | Inventory management | Yes |
| `/maintenance/*` | Equipment & work orders | Yes |
| `/project-risk/*` | Risk management | Yes |
| `/visual-inspection/*` | CSVs & inspections | Yes |
| `/document-intelligence/*` | Document search | Yes |
| `/reports/*` | Report generation | Yes |

## 3. Common Response Formats

### 3.1 Success Response

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-19T10:00:00Z",
    "request_id": "uuid-here"
  }
}
```

### 3.2 Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ],
    "request_id": "uuid-here"
  }
}
```

### 3.3 Pagination

```json
{
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

## 4. Authentication Endpoints

### 4.1 POST /auth/login

Authenticate a user and obtain access + refresh tokens.

**Request:**
```json
{
  "email": "user@company.com",
  "password": "secret123"
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "dGhpcyBpcyBh...",
    "token_type": "bearer",
    "expires_in": 900
  },
  "meta": {
    "timestamp": "2026-10-19T10:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials

### 4.2 POST /auth/refresh

Refresh an access token using a refresh token.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBh...",
  "token_type": "bearer"
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "eyJhbGci...",
    "token_type": "bearer",
    "expires_in": 900
  },
  "meta": {
    "timestamp": "2026-10-19T10:00:00Z"
  }
}
```

## 5. User Management Endpoints

### 5.1 GET /users

List users (admin only).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | int | No | Page number (default: 1) |
| page_size | int | No | Items per page (default: 20) |
| role | string | No | Filter by role |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "email": "user@company.com",
      "role": "manager",
      "company_id": "uuid-1",
      "is_active": true,
      "created_at": "2026-10-01T12:00:00Z"
    }
  ],
  "meta": { ... }
}
```

## 6. Procurement Endpoints

### 6.1 POST /procurement/invoices/sync

Sync invoices from Odoo integration.

**Request:**
```json
{
  "odoo_url": "https://odoo.example.com",
  "odoo_db": "company_db",
  "odoo_username": "sync_user",
  "odoo_password": "secret"
}
```

**Response (200):**
```json
{
  "data": {
    "synced_count": 42,
    "skipped_count": 3,
    "failed_count": 0,
    "last_sync": "2026-10-19T10:00:00Z"
  },
  "meta": {
    "timestamp": "2026-10-19T10:00:00Z",
    "request_id": "uuid-here"
  }
}
```

## 7. Cost Forecasting Endpoints

### 7.1 POST /cost-forecasting/forecasts

Create a new forecast task.

**Request:**
```json
{
  "project_id": "uuid-1",
  "currency": "USD",
  "forecast_type": "budget",  // or "eac"
  "start_date": "2026-01-01",
  "end_date": "2026-12-31"
}
```

## 8. Error Codes Reference

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input data |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `UNPROCESSABLE_ENTITY` | Business rule violation |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | External service unavailable |

See [Error Codes Documentation](02-error-codes.md) for complete details.
