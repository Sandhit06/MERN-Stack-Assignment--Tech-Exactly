# Verification record

Local verification performed on 3 October 2026. Results describe this local build, not a deployed application or completed remote CI run.

## Executed checks

| Check                                   | Result                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| ESLint                                  | Passed                                                                                  |
| Production frontend build               | Passed                                                                                  |
| Backend Jest unit/integration tests     | 19 passed                                                                               |
| Frontend Vitest/component/request tests | 14 passed                                                                               |
| Playwright desktop journeys             | 3 passed                                                                                |
| Playwright mobile viewport journeys     | 3 passed                                                                                |
| npm dependency advisory check           | 0 known vulnerabilities reported after updating Vitest                                  |
| Live seeded-app visual check            | Homepage, mobile homepage and admin screenshots reviewed; no page errors during capture |
| Git ignore checks                       | `.env`, database files, node_modules, builds and coverage excluded                      |

The initial browser run found stale data being rendered during an admin-tab transition. The resource hook now tracks the resource URL with its data and never exposes an old shape to a new screen. A dedicated frontend regression test and the successful browser rerun verify the fix.

## Coverage and scope

The executed backend coverage run measured **91.35% statements and 86.89% branches** across the service, middleware, validator and response-utility modules. Tests cover actual routes with a real disposable MongoDB process, not mocked persistence. Config, route declarations and controllers are exercised by integration requests but are not part of that reported coverage denominator.

The frontend unit coverage run measured **63.04% statements and 47.36% branches** across the selected API client, shared components and authentication context. The request client itself measured 92.1% statements and 86.36% branches. Shared layout/dialog code is primarily exercised through browser journeys; browser execution is not merged into Vitest coverage. Page-level component coverage is not claimed by that number.

Coverage is reported honestly; it does not imply every failure mode is tested. The backend has enforced 80% statement/branch gates. The frontend does not currently enforce a percentage gate.

The seeded database was checked after a repeat seed: 3 users, 6 posts, 1 comment, and no missing post timestamps. An `explain('executionStats')` check for the newest-post feed used the compound `deletedAt_1_createdAt_-1__id_-1` index and examined 6 keys/documents for the 6 seeded records. This validates the query/index connection on a small dataset; it is not a scalability benchmark.

## Meaningful scenarios covered

- Registration validation, duplicate emails, role injection rejection and hashed passwords.
- Login success/failure, safe user serialization and missing/invalid/expired tokens.
- Refresh rotation, concurrent refresh, replay detection and logout revocation.
- Origin/custom-header checks and authentication rate limiting.
- Post CRUD, cross-user modification rejection, unique/stable slugs and bounded pagination.
- Soft-deleted posts disappearing from direct ID/slug/list/comment routes.
- Comment ownership, parent availability, admin moderation and dashboard count definitions.
- Admin-route restrictions, last-admin safeguards and disabled/deleted account behavior.
- OAuth identity reuse, missing email, account collision, and browser-bound one-use state with a PKCE verifier.
- React route guards, authentication forms, useful network errors and shared refresh requests.
- Admin-tab stale-response regression.
- Browser registration → publication → edit → comment edit/delete → session restoration → story deletion → logout.
- Browser admin moderation and last-admin guard on desktop and mobile layouts.
- Literal script-like content remains text rather than executing as HTML.

## Repeat the checks

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run test:coverage
npm.cmd run build
npm.cmd run test:e2e
npm.cmd audit
```

Build before browser tests, because the test server serves `client/dist`.

Test MongoDB processes use isolated, disposable databases. They neither seed nor clear your development database. MongoDB download caching is shared to avoid repeated large downloads. Cleanup is guarded in backend tests by the database name `margin_test`.

## Limits and pending checks

- **Real Google/Facebook login remains unverified.** Developer apps/credentials are not provided. Automated identity/state tests do not replace provider callback/browser verification.
- Mobile tests use Chromium device emulation; physical-device Safari/Firefox coverage has not been run.
- The workflow file is provided, but GitHub Actions has not run because nothing was pushed.
- This is not a load test, penetration test, independent security audit or production deployment certification.
- The MongoDB convenience runner uses a pinned development binary; npm audit covers JavaScript dependencies, not the database binary.
- A 5–10 minute demo script exists; the final user-presented video has not been recorded.
- Optional real-time notifications are not implemented.

Some compiler/process commands needed execution outside the restricted assistant sandbox on Windows. These were environment access restrictions, not application errors. The documented commands are intended for a normal local terminal.
