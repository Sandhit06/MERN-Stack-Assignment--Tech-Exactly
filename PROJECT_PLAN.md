# MERN blog assignment: implementation and test plan

Status: original planning record. Implementation subsequently completed locally; see README.md and docs/TESTING.md for the delivered scope, executed checks, and remaining provider setup. The planning text below is preserved as the original design proposal, not the current build status.
Reviewed on 2 October 2026. Source: all three pages of `MERN Stack Assignment.pdf`.
The workspace initially contained only this PDF. No separate requirements or existing code were present.

## 1. Scope and completion criteria

Build a blog application with MongoDB, Express, React, and Node.js. The complete required scope is:

| Area | Required behavior | Evidence of completion |
| --- | --- | --- |
| Authentication | Register, login, logout; JWT access and refresh tokens; password hashing; rate limiting; environment-based secrets; Google and Facebook OAuth | Automated positive/negative authentication tests plus real provider login checks |
| Authorization | Admin and regular user; backend RBAC; users modify only their own posts/comments | API tests using two users and an admin, including forged requests |
| Posts | CRUD; title, content, author, timestamps; validation; unique URL-friendly slug; Mongoose; soft deletion | API and browser flows, collision tests, deleted-content exclusion |
| Comments | CRUD; post/user references; owner-only modifications; admin moderation | Ownership, parent-post, and moderation tests |
| Admin | Dedicated React panel; manage users, posts, comments; total user/post/comment counts | Admin browser walkthrough and API authorization/count tests |
| API | Versioned REST routes grouped with Express Router; modular middleware; centralized errors | Documented contracts and consistent success/error integration tests |
| Activity logging | Record login and post creation/deletion, with reusable middleware | Tests checking actor, action, target, outcome; no logged credentials |
| Architecture | Separate controllers, services, models, routes, middleware | Thin controllers, business rules in services, documented folder structure |
| Performance | Indexes, bounded pagination, selective population | Query review and representative query-plan checks |
| Frontend | Functional components, Hooks, global authentication, authenticated/admin route guards | Component and browser tests, including refresh and direct route navigation |
| Delivery | Complete GitHub repository, setup/features/API README, 5-10 minute demo | Clean setup rehearsal, repository review, and recorded walkthrough |

Real-time notifications are the sole explicit optional bonus. Implement them only after the mandatory scope passes.

## 2. Proposed decisions where the PDF is silent

These are planning defaults, not additional assignment requirements:

- Visitors can read active posts and their comments. Signing in is required to write.
- Posts publish immediately. Start with plain-text content rendered safely; rich text, images, drafts, tags, and search are outside the initial scope.
- A post's slug remains stable after title edits. A unique index and collision retry handle duplicate titles and concurrent creation.
- Deleting a post sets `deletedAt`. Public routes and normal author lists exclude it. Associated comments are retained but cannot be read or modified through public routes while the post is deleted. Admin moderation can inspect retained content.
- Comment deletion is permanent; the PDF only mandates soft deletion for posts.
- User management includes listing, changing roles, disabling/reactivating, and soft deletion. Deleted users cannot authenticate; retained authored content displays a neutral author label. Disabling preserves the existing author identity. Sessions are revoked when access is withdrawn.
- Prevent removal, disabling, or demotion of the last active admin. Do not permit public registration to set roles. Bootstrap the initial admin through a local seed command using environment-provided credentials.
- Dashboard primary totals count non-deleted users, non-deleted posts, and comments on non-deleted posts. Disabled users remain included in the user total. Labels explain these definitions; retained/deleted records can be shown separately.
- No automatic merging of social and password accounts solely because their email strings match. Identify OAuth users by provider and provider user ID; an email collision requires an authenticated linking flow or a clear sign-in instruction. Handle missing provider email explicitly.

## 3. Technical design

Proposed stack: React with Vite, React Router and Context for authentication; Express with Mongoose, Zod, bcrypt, a maintained JWT library, OAuth libraries, rate limiting, and structured logging. Use JavaScript consistently to keep the assignment straightforward. Pin compatible package versions and commit the npm lockfile during implementation.

Use one repository with npm workspaces:

```text
client/src/
  components/ pages/ layouts/ routes/ context/ hooks/ api/
server/src/
  config/ controllers/ services/ models/ routes/ middleware/ validators/ utils/
server/tests/
client/src/**/__tests__/
e2e/
docs/
```

Request flow: route -> authentication/authorization/validation middleware -> controller -> service -> Mongoose -> consistent HTTP response. Ownership filters also belong in service/database operations so changing an ID cannot bypass authorization.

Collections:

- User: display name, normalized email when available, optional password hash, role, status, timestamps, deletion marker.
- OAuthIdentity: provider, provider user ID, user reference; unique provider/ID pair.
- AuthSession: user reference, session/family identifier, current refresh-token hash, expiry, revoked marker. Atomic rotation prevents reusing the same refresh token successfully.
- Post: title, content, unique slug, author reference, timestamps, deletedAt.
- Comment: content, post reference, author reference, timestamps.
- ActivityLog: actor where known, action, target, outcome, timestamp, request ID. Never store passwords or raw tokens.

Initial indexes: unique normalized email where present, unique OAuth identity, unique slug, post deletion/creation ordering, author/deletion/creation ordering, comment post/creation ordering, session identifier and expiry. Add indexes based on actual query shapes, not every field. Use stable secondary ordering, page-size caps, field projection, and bounded population.

API groups under `/api/v1`:

- `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`.
- `/auth/google` and callback; `/auth/facebook` and callback.
- `/posts`, `/posts/:id`, `/posts/slug/:slug` (define static routes before ID routes).
- `/posts/:postId/comments`, `/comments/:id`.
- `/admin/stats`, `/admin/users`, `/admin/users/:id`, plus admin post/comment listing and management.

Use an agreed response envelope, pagination metadata, and stable error codes. Apply 400 for invalid input, 401 for missing/invalid authentication, 403 for forbidden actions, 404 for missing/hidden content, 409 for conflicts, and 429 for rate limits. Never return stack traces or sensitive model fields to clients.

Authentication design:

- Short-lived JWT access token held in frontend memory; refresh token in an HttpOnly cookie, Secure in HTTPS environments, with an appropriate SameSite policy and restricted path.
- Proposed expiries: 15-minute access token and 7-day session. Rotate refresh tokens atomically, hash stored tokens, detect reuse, and revoke the affected session family.
- Validate token signature, permitted algorithm, issuer, audience, expiry, current user status, role, and session revocation. This makes logout/disable effective for already-issued access tokens.
- Restore the frontend session through refresh on reload. Coordinate concurrent refresh calls, retry a request at most once, and handle expired sessions cleanly.
- Use a Vite API proxy for local requests. Protect cookie-authenticated endpoints with origin checks and CSRF defenses appropriate to the chosen deployment; allow only configured origins.
- OAuth uses the backend authorization-code flow with state validation and provider-supported PKCE. App tokens are issued by our backend; provider tokens do not become app JWTs. Do not put app tokens in redirect URLs.

## 4. Execution sequence and checkpoints

1. **Finalize contracts and environment.** Convert the scope table into a checklist, record defaults, sketch pages, define API contracts and schemas. Verify Node/MongoDB/browser compatibility. Configure provider apps early because OAuth credentials and provider settings are external dependencies.
   Checkpoint: routes, permission rules, data rules, and setup requirements are documented.
2. **Scaffold the project.** Create client/server workspaces, environment validation, `.env.example`, `.gitignore`, database connection, health endpoint, lint/build/test scripts, centralized errors, and baseline test harness.
   Checkpoint: frontend starts, API health succeeds, MongoDB connects, secrets are excluded from Git.
3. **Implement password authentication and sessions.** Registration, hashing, login, refresh rotation, logout, limits, session restoration, authentication middleware, and admin bootstrap.
   Checkpoint: authentication tests cover success, expiry, replay, revocation, duplicate registration, and bad input.
4. **Integrate Google and Facebook.** Add provider identities, callback validation, cancellation/error screens, missing-email handling, and safe account-collision behavior.
   Checkpoint: mocked provider integration tests pass; real browser checks complete once provider setup is available. Mock success alone does not prove real OAuth works.
5. **Implement posts.** Schemas/indexes, validation, CRUD, ownership enforcement, stable slugs, pagination, soft deletion, and activity events.
   Checkpoint: two-user/admin API matrix passes; deleted posts cannot be fetched through alternate public routes.
6. **Implement comments.** CRUD, references, ownership, admin moderation, pagination, and parent-post availability checks.
   Checkpoint: cross-user changes fail and deleted/missing parent posts cannot receive comments.
7. **Implement admin services.** User management, session revocation, all-post/comment management, protected counts, and last-admin safeguard.
   Checkpoint: regular users fail every admin API check and totals match seeded data/deletion policy.
8. **Complete the React experience.** Public feed/detail, register/login, social buttons, create/edit post, My Posts, comment controls, admin dashboard/users/posts/comments. Add global auth, route guards, pending/error/empty states, validation feedback, confirmation dialogs, responsive layouts, and accessible controls. A thin auth UI can be built during steps 3-4 to verify redirects.
   Checkpoint: every required workflow works through the browser; direct URLs and session reloads behave correctly.
9. **Run the full verification pass.** Unit, integration, browser, authorization, persistence, accessibility smoke checks, and representative pagination/query checks. Fix defects and rerun affected checks.
   Checkpoint: required workflows pass, coverage gaps are reviewed, lint/build/tests pass, real OAuth status is accurately recorded.
10. **Prepare submission.** README, API overview, environment/provider instructions, safe demo seed data, clean-install rehearsal, GitHub-ready repository, and a 5-10 minute demo script/video. Publishing and recording are later delivery activities.
   Checkpoint: a fresh checkout can be started from the README and every mandatory requirement has evidence.
11. **Optional bonus.** Add real-time comment notifications only after required completion. Authenticate sockets, authorize rooms, and test two sessions plus reconnect behavior.

## 5. Test strategy

Tests will be developed alongside each feature, followed by a dedicated system-testing pass.

| Layer | Proposed tools | Main checks |
| --- | --- | --- |
| Backend units | Jest | Validation, slug behavior, permission rules, session logic, service branches |
| API integration | Jest + Supertest + isolated MongoDB test database | Real middleware/routes/models, indexes, references, token lifecycle, authorization and count rules |
| React components | Vitest + React Testing Library | Forms, auth provider, protected routes, error/loading states, ownership controls |
| Browser end-to-end | Playwright | Register/login, create/edit/delete, comments, admin management, refresh/logout, mobile viewport |
| Live provider verification | Normal browser + configured OAuth apps | Google and Facebook success, cancellation, callback settings, repeat login |
| Manual review | Browser DevTools; optional API client/Compass | Responsive UI, keyboard use, cookie behavior, persistence, logs and query inspection |

Use fixtures with one admin, User A, User B, active/deleted posts, and comments from both users. Give tests their own database name and guard destructive cleanup so it cannot touch development data. Keep provider calls mocked in deterministic automated suites; run real provider login as separate manual smoke tests. Add a minimal CI workflow using the same checks.

Critical regression scenarios:

- Registration cannot inject an admin role; author IDs cannot be spoofed.
- User B cannot edit/delete A's post or comment even with a manually crafted request.
- A post's author cannot moderate someone else's comment unless also an admin.
- Expired/tampered tokens, logged-out sessions, and disabled/deleted accounts are rejected.
- Refresh-token reuse, concurrent refresh, denied OAuth consent, and invalid OAuth state are handled.
- Duplicate titles/concurrent slug creation do not overwrite posts.
- Deleted posts are excluded from feeds, slug lookup, nested comments, and active dashboard totals.
- Invalid IDs/pagination/payloads, unknown routes, database errors, and rate limits have consistent responses.
- Post/comment content is rendered without executing embedded script/HTML.
- Pagination is stable for unchanged data and returns bounded payloads without sensitive populated fields.

Proposed coverage target: at least 80% statements/branches for core backend business logic, with explicit tests for every permission and authentication rule. This is our working target; the assignment specifies good coverage without a number. Coverage percentages do not replace browser and real-provider checks.

## 6. Local software and external setup

Observed locally: Node.js 24.19.0, npm 11.17.0, Git 2.47.1. MongoDB and Docker were not found on PATH; no MongoDB service or standard Program Files installation was found in the limited checks. This does not prove they are absent everywhere. OS version detection was unavailable, so exact compatibility remains to be checked.

| Item | Needed? | Purpose |
| --- | --- | --- |
| Node.js 24 LTS and npm | Yes; already detected | Run API, frontend tooling, package installation and tests; update to a supported patch during setup |
| MongoDB Community Server | Yes for the proposed fully local setup | Persist users/posts/comments/sessions and host isolated test databases |
| Chrome or Edge | Yes | Manual application and OAuth testing with DevTools |
| Git | Yes for delivery; detected | Version control and GitHub submission |
| Editor such as VS Code | Optional if an editor is already available | Inspect/edit/debug source |
| MongoDB Compass | Optional | Visual database inspection; does not replace MongoDB Server |
| Postman or equivalent | Optional | Manually inspect API requests; automated API tests do not require it |
| Docker Desktop | Optional alternative | Containerized MongoDB; not required alongside a native MongoDB install |
| Screen recorder | Needed for final demo | Record the required 5-10 minute video |

Jest, Supertest, Vitest, React Testing Library, and Playwright will be project development dependencies, installed by npm. Playwright also downloads test browsers. No global test-framework installation is needed.

Required external setup for real social login: a Google OAuth web client and a Meta/Facebook app, appropriate test access, client IDs/secrets, and registered callback URLs. Provider setup requires account-owner participation. Verify Meta's current dashboard requirements during implementation; its documentation could not be retrieved during this review. If its chosen configuration requires HTTPS, use local HTTPS or an HTTPS development tunnel. Ordinary password-login/blog testing stays local; real social login needs internet access.

Proposed local addresses: frontend `http://localhost:5173`, API `http://localhost:5000/api/v1`, MongoDB `mongodb://127.0.0.1:27017/mern_blog_dev`, separate `mern_blog_test` database.

Planned scripts, to be created later: `npm run dev`, `npm run seed`, `npm run lint`, `npm run build`, `npm test`, `npm run test:coverage`, `npm run test:e2e`.

Planned environment keys include database URI, API port, frontend origin, JWT signing configuration/issuer/audience, provider credentials/callback URLs, and bootstrap admin credentials. Only intentionally public configuration belongs in frontend environment variables.

References checked for environment planning:
- Node release schedule: https://nodejs.org/en/about/previous-releases
- MongoDB Windows installation: https://www.mongodb.com/docs/manual/administration/install-community-windows/
- Google web-server OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- Playwright installation and system requirements: https://playwright.dev/docs/intro

## 7. Boundary for this phase

This document records the execution plan and design rationale. No application scaffolding, dependency installation, account configuration, implementation, or test execution was performed. Next phase begins with environment verification and the agreed contracts.
