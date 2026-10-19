# Estim AI Platform - Error Codes Documentation

## 1. Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [ ... ],  // Optional, additional context
    "request_id": "uuid-here"
  }
}
```

### Fields

## 2. HTTP Status Code Mapping

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

### 3.2 Validation Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `VALIDATION_ERROR` | 400 | Input validation failed | Check field values |
| `MISSING_REQUIRED_FIELD` | 400 | Required field not provided | Add missing field |
| `INVALID_FORMAT` | 400 | Field format is invalid | Check format requirements |

**Example with details:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"

### 3.6 Business Rule Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `UNPROCESSABLE_ENTITY` | 422 | Business rule violation | Check business rules |
| `STATUS_CONFLICT` | 422 | Invalid state transition | Check current status |
| `DEPENDENCY_VIOLATION` | 422 | Cannot delete due to dependencies | Resolve dependencies first |

### 3.7 Service Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `SERVICE_UNAVAILABLE` | 503 | External service (Odoo, MLflow) unavailable | Check service status |

## 4. Error Codes by Module

### 4.1 Identity Module

```text
400 VALIDATION_ERROR       - Invalid user data
401 UNAUTHORIZED           - Missing/invalid token
403 FORBIDDEN              - No permission to manage users
404 NOT_FOUND              - User not found
409 CONFLICT               - Email already registered
422 UNPROCESSABLE_ENTITY   - Cannot deactivate own account
500 INTERNAL_ERROR         - Database error
```

### 4.2 Procurement Module

## 5. Error Handling Best Practices

### 5.1 Client-Side Handling

| HTTP Status | Recommended Action |
|-------------|-------------------|
| 400 | Display field-level errors |
| 401 | Redirect to login |
| 403 | Display "access denied" message |
| 404 | Display "not found" message |
| 409 | Offer to resolve conflict |
| 422 | Display business rule message |
| 429 | Display "try again later" |
| 500-503 | Display generic error, log request ID |

### 5.2 Request ID

Always capture the `request_id` from error responses for support. It allows support to trace the exact request in logs.

**Example:**
```
Request ID: 550e8400-e29b-41d4-a716-446655440000
Include this when contacting support for error investigation.
```

## 6. Related Documentation

- [API Reference](00-api-reference.md)
- [Authentication](01-authentication.md)


```text
400 VALIDATION_ERROR       - Invalid invoice data
401 UNAUTHORIZED           - Missing/invalid token
403 FORBIDDEN              - No permission to access procurement
404 NOT_FOUND              - Invoice not found
409 CONFLICT               - Duplicate invoice found
422 UNPROCESSABLE_ENTITY   - Invoice not in sync state
503 SERVICE_UNAVAILABLE    - Odoo sync failed
500 INTERNAL_ERROR         - Database error
```

### 4.3 Cost Forecasting Module

```text
400 VALIDATION_ERROR       - Invalid forecast data
401 UNAUTHORIZED           - Missing/invalid token
403 FORBIDDEN              - No permission to access forecasts
404 NOT_FOUND              - Forecast not found
409 CONFLICT               - Forecast already generated
422 UNPROCESSABLE_ENTITY   - Forecast in wrong state
503 SERVICE_UNAVAILABLE    - MLflow model unavailable
500 INTERNAL_ERROR         - Database error
```

### 4.4 Inventory Module

```text
400 VALIDATION_ERROR       - Invalid stock data
401 UNAUTHORIZED           - Missing/invalid token
403 FORBIDDEN              - No permission to access inventory
404 NOT_FOUND              - Item not found
409 CONFLICT               - Duplicate stock movement
422 UNPROCESSABLE_ENTITY   - Insufficient stock for transfer
500 INTERNAL_ERROR         - Database error
```

| `ODOO_SYNC_FAILED` | 503 | Odoo integration failed | Check Odoo credentials |
| `MLFLOW_ERROR` | 503 | MLflow service error | Check MLflow status |

### 3.8 Internal Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error | Contact support |
| `DATABASE_ERROR` | 500 | Database operation failed | Check database logs |
| `CONNECTION_ERROR` | 500 | Connection to external service failed | Check network/config |

      }
    ],
    "request_id": "uuid-here"
  }
}
```

### 3.3 Permission Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `FORBIDDEN` | 403 | Insufficient permissions | Contact admin for access |
| `NOT_OWNER` | 403 | Cannot access resource owned by another company | Use company-specific endpoints |
| `ROLE_REQUIRED` | 403 | Insufficient role for this action | Admin or manager required |

### 3.4 Not Found Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `NOT_FOUND` | 404 | Resource not found | Check URL and IDs |
| `MODULE_NOT_FOUND` | 404 | Module not found | Check module path |

### 3.5 Conflict Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `CONFLICT` | 409 | Resource already exists | Update existing resource |
| `DUPLICATE_EMAIL` | 409 | Email already registered | Use different email |
| `DUPLICATE_RECORD` | 409 | Record already exists |


## 3. Complete Error Codes Reference

### 3.1 Authentication Errors

| Code | HTTP | Description | Resolution |
|------|------|-------------|------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token | Check `Authorization` header |
| `TOKEN_EXPIRED` | 401 | Access token has expired | Refresh token |
| `TOKEN_INVALID` | 401 | Token signature invalid | Re-login required |
| `LOGIN_FAILED` | 401 | Invalid credentials | Check email/password |
| `TOKEN_REFRESH_FAILED` | 401 | Refresh token invalid or expired | Re-login required |
| `RATE_LIMITED` | 429 | Too many login attempts | Wait before retry |


| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable description |
| `details` | array | Optional field-level details |
| `request_id` | string | Unique request identifier (for support) |
