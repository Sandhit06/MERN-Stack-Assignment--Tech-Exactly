# Margin API reference

Base: `http://localhost:5000/api/v1`. In the browser, use relative `/api/v1` URLs through Vite's proxy at port 5173.

## Conventions

- JSON requests/responses; `Content-Type: application/json` for bodies.
- Protected routes need `Authorization: Bearer <accessToken>`.
- Browser mutations send `X-Margin-Client: web`; required when the refresh cookie is present.
- Any supplied `Origin` must match `FRONTEND_URL`.
- No wildcard CORS. Use same-origin requests/proxying.
- Object IDs must be 24 hexadecimal characters.
- Success: `{ "data": ... }`.
- Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "requestId": "..." } }`.
- Rate-limit errors use the same error envelope but omit requestId; inspect the `X-Request-Id` header.
- `page`: integer 1–10000, default 1. `limit`: integer 1–50, default 9.
- Lists return `data.items` and `data.pagination: { page, limit, total, pages }`.
- Lists sort newest first, then descending ID for stable ordering when dates match. Offset pagination can shift when concurrent inserts/deletes occur.

## Authentication

| Method | Endpoint                  | Body / behavior                                                 |
| ------ | ------------------------- | --------------------------------------------------------------- |
| POST   | `/auth/register`          | `{name,email,password}`; returns 201 session and refresh cookie |
| POST   | `/auth/login`             | `{email,password}`; returns session and refresh cookie          |
| POST   | `/auth/refresh`           | Refresh cookie required; rotates it and returns a new session   |
| POST   | `/auth/logout`            | Revokes cookie's session, clears cookie; idempotent             |
| GET    | `/auth/me`                | Access token required; safe current-user fields                 |
| GET    | `/auth/providers`         | `{google:boolean,facebook:boolean}` configuration availability  |
| GET    | `/auth/google`            | Browser redirect to Google, or login page with setup error      |
| GET    | `/auth/google/callback`   | Provider callback; refresh cookie and frontend redirect         |
| GET    | `/auth/facebook`          | Browser redirect to Facebook, or login page with setup error    |
| GET    | `/auth/facebook/callback` | Provider callback; refresh cookie and frontend redirect         |

Name: 2–60 trimmed characters. Email: valid, normalized lowercase, max 254. Registration password: minimum 10 characters, at most 72 UTF-8 bytes. Unexpected request fields are rejected. Login uses the same generic error for unknown email, wrong password, disabled account, and deleted account.

Session response example:

```json
{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Reader",
      "email": "reader@example.com",
      "role": "user",
      "status": "active",
      "deletedAt": null
    },
    "accessToken": "<short-lived JWT>"
  }
}
```

The refresh token never appears in JSON. Refresh cookies are scoped to `/api/v1/auth`, HttpOnly, SameSite=Lax, and Secure in production. Registration/login/OAuth share a 30 requests/15 minutes per-IP limit; refresh/logout share 60 requests/minute. Limiters use local memory for this single-process app.

## Posts

| Method | Endpoint                | Permission / input                             |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/posts?page=1&limit=9` | Public non-deleted stories                     |
| GET    | `/posts?mine=true`      | Authenticated author's non-deleted stories     |
| GET    | `/posts/slug/:slug`     | Public detail by stable slug                   |
| GET    | `/posts/:id`            | Public detail by ID                            |
| POST   | `/posts`                | Any authenticated user; `{title,content}`; 201 |
| PATCH  | `/posts/:id`            | Owner or admin; `{title,content}`              |
| DELETE | `/posts/:id`            | Owner or admin; soft deletion                  |

Title: 3–160 trimmed characters. Content: 20–50000 trimmed characters. PATCH expects both fields. The backend supplies author/timestamps. Slugs are generated once and remain stable after edits. Duplicate titles receive collision-resistant suffixes; a MongoDB unique index enforces uniqueness.

Post responses include `id`, `title`, `content`, `slug`, `author: {id,name}`, `createdAt`, `updatedAt`, `deletedAt`. Public responses do not expose author email or account status. List responses currently include full bounded content; excerpt-only list projection is a possible optimization if the dataset grows.

Missing/deleted posts and unauthorized owner mutations return 404. This avoids revealing whether a private modification target exists. `deleted=true` never exposes deleted content through the public list.

## Comments

| Method | Endpoint                  | Permission / input                         |
| ------ | ------------------------- | ------------------------------------------ |
| GET    | `/posts/:postId/comments` | Public, paginated, active parent required  |
| POST   | `/posts/:postId/comments` | Authenticated; `{content}`; 201            |
| PATCH  | `/comments/:id`           | Comment owner or admin; `{content}`        |
| DELETE | `/comments/:id`           | Comment owner or admin; permanent deletion |

Content: 1–2000 trimmed characters. Post owners cannot modify another user's comment solely because they own the post. A regular user's access to comments stops when the parent post is deleted. Admin moderation can still update/remove those retained comments.

## Admin

All routes require a current admin account and active session.

| Method | Endpoint           | Behavior                                                                   |
| ------ | ------------------ | -------------------------------------------------------------------------- |
| GET    | `/admin/stats`     | `{users,posts,comments}` with documented active-content count rules        |
| GET    | `/admin/users`     | Paginated non-deleted users; `deleted=true` lists deleted users            |
| PATCH  | `/admin/users/:id` | `{role?:"user"\|"admin",status?:"active"\|"disabled"}`; at least one field |
| DELETE | `/admin/users/:id` | Soft-delete user, disable access, revoke sessions                          |
| GET    | `/admin/posts`     | Paginated active posts; `deleted=true` lists deleted posts                 |
| GET    | `/admin/comments`  | Paginated comments, including those on deleted posts                       |

Content edits/deletions use the same `/posts/:id` and `/comments/:id` endpoints; admins are authorized there. Deleted posts are inspection-only in this version. Every user role/status mutation revokes that user's current sessions. The last active admin cannot be demoted, disabled, or deleted. Concurrent account management may return `ADMIN_BUSY`; retry the action.

## Health and errors

`GET /health` returns 200 with `data.status="ok"` when MongoDB is connected, otherwise 503 with `data.status="unavailable"`.

| Status | Typical meaning                                                             |
| ------ | --------------------------------------------------------------------------- |
| 400    | Invalid JSON, ID, schema or pagination                                      |
| 401    | Missing, invalid, expired or revoked session; wrong credentials             |
| 403    | Admin permission required; invalid origin/custom-header check               |
| 404    | Resource/route missing, deleted, or unavailable to the modifying user       |
| 409    | Duplicate account/resource, last-admin safeguard, concurrent admin mutation |
| 413    | Request body exceeds 100 KB                                                 |
| 429    | Rate limit exceeded                                                         |
| 500    | Generic unexpected server error; stack traces are not returned              |

## Manual request example

Using PowerShell, authenticate and inspect your own stories:

```powershell
$body = @{ email = 'your-email@example.com'; password = 'your-password' } | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/api/v1/auth/login' -ContentType 'application/json' -Body $body
$headers = @{ Authorization = "Bearer $($session.data.accessToken)"; 'X-Margin-Client' = 'web' }
Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/posts?mine=true' -Headers $headers
```

Use your actual local account, not the example strings. Do not copy credentials into committed scripts. For cookie/refresh testing, use a PowerShell web session or an API client cookie jar.
