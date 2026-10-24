# StudyGram Repository Audit

Audit pass: 2026-10-24. This checklist records code paths inspected, evidence-backed findings, remediation, and risks that still require owner action. No database, upload, deployment, or Git history was changed.

## Prioritized findings

| Priority | Finding and evidence | Status / action |
| --- | --- | --- |
| High | `backend/base/api/views.py` exposed the read-only `/api/users/` directory to every authenticated account. Its serializer includes usernames, display names, and avatars; no frontend caller exists. | Fixed by scoping list and detail queries to active users who share a workspace with the requester. Added access-boundary tests in `backend/base/tests/test_api.py`. |
| High | `backend/workspaces/consumers.py` rechecked membership before message broadcasts, but its presence event handler previously did not. Revoked channel members could receive presence events until the periodic membership check. | Fixed by checking active workspace membership on every presence event and closing revoked sockets. Added a regression test in `backend/workspaces/workspaces_tests/test_realtime.py`. |
| High | Earlier Git history contains uploaded workspace files, including PDFs. They are absent from the current index, but remain retrievable from existing public history. File contents were not opened during this audit; treat them as exposed. | Unresolved by design: no history rewrite or deletion was performed. Restrict repository access immediately; assess user notification and, if appropriate, coordinate a history purge and fork/cache cleanup. Rotate any credentials discovered in the historical blobs. |
| Medium | The frontend refreshed JWTs during session restoration only. Access tokens expire after 60 minutes, so active sessions could begin failing API calls. | Fixed with a single-flight refresh and one retry in `frontend/src/services/api.js`; rotated tokens update `AuthContext`, and logout retries use the rotated refresh token. |
| Medium | DRF login, registration, and password-reset throttles used Django's default process-local cache, so limits did not coordinate across service instances. | Fixed in `backend/config/settings.py`: use Redis cache when `REDIS_URL` is configured and retain in-memory cache for local development. |
| Medium | Channel history is fetched page by page until every message is loaded (`getChannelMessages` → `apiGetAll`), with no history window or incremental scroll loading. Large channels can consume growing network, database, and browser memory. | Open. A safe fix needs a history-loading UX and clear retention/navigation behavior; avoid silently hiding older messages. |
| Medium | JWT refresh rotation is shared only within a browser tab (`refreshRequests` / `refreshInFlight`). Separate tabs can concurrently rotate the same refresh token. | Open. Add cross-tab coordination or change token rotation semantics before relying on long-lived multi-tab sessions. |
| Medium | The refresh token is stored in `localStorage` by `frontend/src/auth/AuthContext.jsx`. React-rendered content is escaped and no unsafe HTML sink was found, but an XSS defect would expose the refresh token. | Open architecture trade-off. Consider an HttpOnly-cookie refresh flow with CSRF protection before handling higher-sensitivity data. |
| Medium | Workspace upload persistence depends on the configured storage backend. Render local filesystem storage is ephemeral; durable operation requires an externally configured private S3-compatible bucket. | Documented in `DEPLOYMENT.md`; not verified against live provider settings or a deployed service. |
| Low | No frontend automated test runner or interaction test suite is configured in `frontend/package.json`. | Open. Add focused component/API tests when test infrastructure is selected; current verification covers lint and build only. |

## Audit coverage

- Inspected repository layout, current Git status, README and deployment docs, Python and npm manifests, Docker/Compose/Nginx configuration, Django settings/ASGI/URL routing, authentication and profile APIs, workspace/file/message permissions, activity/read positions, WebSocket ticket and presence handling, migrations, frontend auth/API clients, major profile/activity/chat components, and responsive styles.
- Reviewed CORS/CSRF, proxy HTTPS settings, JWT rotation/blacklisting, password reset, upload validation/storage, Redis TLS enforcement, and rate-limit cache configuration.
- Confirmed current Git index excludes the local SQLite database and upload directories; `.env.example` is the only tracked environment file. A current-tree pattern scan found no common private-key, cloud-key, GitHub-token, or Slack-token formats. This is not proof that no credential exists in historical blobs; the broad historical secret scan could not complete because Git’s diff helper failed under the local sandbox.
- Migration `base.0006` uses `SeparateDatabaseAndState` with no database operations, preserving legacy Room/Topic/Message tables and their data. The tables remain orphaned after migration. Migration consistency was checked; an actual fresh PostgreSQL initialization was not run.
- Activity queries are authenticated, server-side scoped by workspace membership, exclude the requester’s messages, and use a bounded page size. Read positions are per user/channel and store a monotonic message ID; deleted messages naturally disappear from active and history results because messages are the source records.
- No visual browser pass or live deployment smoke test was performed. No API schema or model migration was added by this audit.

## Validation record

| Check | Result | Notes |
| --- | --- | --- |
| Frontend ESLint | PASS (after remediation) | Vite ESLint CLI run against `frontend/`. |
| Frontend production build | PASS | Vite production build completed. |
| Backend Python syntax compilation | PASS | Changed consumer, regression test, user-directory view, and API test modules compile. |
| Django system checks | PASS | `manage.py check`: no issues. |
| Backend regression tests | PASS | Full suite: 247 tests, all passed in 333.396 seconds. Includes the new directory-scope and presence-revocation tests. |
| Migration consistency check | PASS | `makemigrations --check --dry-run`: no changes detected. |
| Django production deployment check | PASS WITH WARNING | Ran with placeholder-only production settings. One `security.W021` warning because HSTS preload is intentionally disabled pending domain review; no provider connection was made. |
| Docker builds | NOT RUN | Docker CLI is unavailable in this environment. |
| Python dependency vulnerability scan | NOT RUN | `pip-audit` / `bandit` are unavailable. |
| npm dependency vulnerability scan | PASS (offline) | `npm audit --offline`: 0 vulnerabilities reported from the available local advisory data. |
| Browser interaction / visual QA | NOT RUN | No browser session was used for this audit. |

## Release blockers and next actions

1. Resolve historical upload exposure before treating the public repository as safe for private data; coordinate history remediation separately because it changes shared Git history.
2. Verify the migration chain by initializing a disposable PostgreSQL database before deployment; no production database was contacted.
3. Resolve channel-history pagination and cross-tab refresh rotation before expecting large channels or multi-tab sessions to behave reliably.
4. Set and verify production secrets, PostgreSQL, TLS Redis, HTTPS origins, email, and durable private media storage in provider dashboards; deployment is not complete.
