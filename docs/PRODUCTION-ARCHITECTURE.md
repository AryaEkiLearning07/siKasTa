# siKaTa Production Architecture

Dokumen ini mendesain siKaTa sebagai sistem keuangan kelas yang siap tumbuh dari satu sekolah ke banyak sekolah/cabang tanpa perlu rewrite besar. Implementasi saat ini tetap modular monolith di Next.js, karena itu paling sederhana untuk dioperasikan, tetapi boundary domain dibuat jelas agar dapat dipisah menjadi service/worker ketika traffic naik.

## 1. System Architecture

### Target Production Topology

```text
Browser / Mobile Web
  |
  | HTTPS
  v
CDN / Edge
  |-- static assets, image optimization, WAF/rate limit
  v
Next.js App Runtime
  |-- Server Components and route handlers
  |-- Auth/session validation
  |-- API validation and service orchestration
  v
Domain Service Layer
  |-- Classes, users, students, payments, expenses, savings, reports
  |-- authorization policies
  |-- audit event emission
  v
Data Layer
  |-- MySQL primary database
  |-- Redis cache/session/rate-limit store, future
  |-- Object storage for uploaded proof images
  |-- Queue/worker for exports, reports, and notifications, future
```

### Runtime Responsibilities

- Edge/CDN: TLS termination, static asset caching, WAF, request size limits, and coarse rate limiting.
- Next.js app: UI rendering, session-aware pages, API route handlers, input validation, and thin orchestration.
- Domain services: business rules, transaction boundaries, audit metadata, and consistent error handling.
- MySQL: source of truth for all financial and identity data.
- Object storage: receipt/proof images via signed upload URLs.
- Future Redis: short-lived read cache, session index, distributed locks, and rate limits.
- Future queue/worker: report exports, notification fanout, import processing, and audit log pipelines.

## 2. Component Structure

Recommended structure for scalable maintenance:

```text
src/
  app/
    api/                     route handlers only, no complex business logic
    admin/                   role-scoped pages
    wali-kelas/
    bendahara/
    kepala-sekolah/
  components/
    ui/                      generic primitives
    layouts/                 authenticated shells
    admin/                   admin feature UI
    class/                   class-scoped feature UI
    domain/                  shared domain widgets
  lib/
    api.ts                   response helpers and HTTP conventions
    cache.ts                 cache policy names and headers
    services/                business use cases
    repositories/            future: raw DB access per aggregate
    auth.ts                  session lifecycle
    authorize.ts             authorization policy helpers
    audit.ts                 audit metadata/event helpers
    validations.ts           zod schemas shared by API/UI
prisma/
  schema.prisma              source-of-truth schema and indexes
docs/
  PRODUCTION-ARCHITECTURE.md architecture and operating model
```

Design rule: app route handlers parse/authorize/call a service/respond. Services own transactions and business invariants. Components never call Prisma directly.

## 3. Data Flow

### Login

1. User submits credentials to `POST /api/auth/login`.
2. API validates request with Zod.
3. User is fetched by username.
4. Password hash is checked.
5. A session row is created and stored in an HTTP-only cookie.
6. Audit log is written asynchronously.
7. UI routes to the role dashboard.

### Create Class

1. Admin submits class form.
2. UI calls `POST /api/admin/classes` with `name`, `tingkat`, and `tahunAjaran`.
3. API validates session role `ADMIN`.
4. API validates payload using `createClassSchema`.
5. Class service checks unique `(name, tahunAjaran)`.
6. Service creates class and audit log in one DB transaction.
7. API returns the created class with `Cache-Control: no-store`.
8. UI inserts the class into local state immediately and switches the academic-year filter to the new class.

### Monthly Report

1. Role dashboard requests report parameters.
2. API validates role and date range.
3. Report service reads class, student, payment, and expense aggregates.
4. Result may be cached briefly by parameter and role scope.
5. Export requests should move to worker/queue once files get large.

## 4. API Design

### Conventions

- Authentication: HTTP-only session cookie.
- Authorization: role and class-scope checks in route or domain policy.
- Validation: Zod schemas at API boundary.
- Response shape:

```json
{
  "data": {}
}
```

or legacy-compatible payloads while migrating:

```json
{
  "classes": []
}
```

Errors:

```json
{
  "error": "Human readable message",
  "details": {}
}
```

### Current API Surface

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/classes`
- `POST /api/admin/classes`
- `DELETE /api/admin/classes/:id`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `DELETE /api/admin/users?id=...`
- `GET /api/classes/:id`
- `GET|POST /api/classes/:id/students`
- `GET|POST /api/classes/:id/expenses`
- `GET|POST /api/classes/:id/savings`
- `GET|POST /api/classes/:id/savings/transactions`
- `GET|POST /api/classes/:id/savings/withdrawals`
- `POST /api/payments/toggle`
- `GET /api/reports/overview`
- `GET /api/reports/export`
- `POST /api/uploads/presign`

### Scalability Rules

- Use cursor pagination for high-cardinality tables: audit logs, savings transactions, payments.
- Keep write endpoints idempotent where practical, especially imports and payment toggles.
- Use explicit transaction boundaries for financial writes.
- Keep aggregate read endpoints separated from mutation endpoints.
- Add request IDs to responses and logs in the next observability pass.

## 5. Database Schema

The current Prisma schema already has the core aggregates:

- `User`: authenticated actors with role and optional class scope.
- `Class`: class identity, grade level, academic year, monthly cash nominal.
- `Student`: students scoped to a class with status.
- `Payment`: monthly class cash payment state.
- `Expense`: class expenditure records.
- `SavingsAccount`: per-student savings account.
- `SavingsTransaction`: savings deposit/withdrawal ledger.
- `WithdrawalRequest`: approval workflow for withdrawals.
- `Session`: server-side session rows.
- `AuditLog`: security and operational event trail.
- `Notification`: future in-app notifications.

Important existing constraints/indexes:

- `Class @@unique([name, tahunAjaran])`
- `Payment @@unique([studentId, year, month])`
- `User @@index([classId, role])`
- `Student @@index([classId, status, name])`
- `Expense @@index([classId, spentAt])`
- `SavingsTransaction @@index([classId, transactionDate])`
- `WithdrawalRequest @@index([classId, status])`
- `AuditLog @@index([eventType, createdAt])`

Future production additions:

- Add `School`/tenant model before multi-school rollout.
- Add soft-delete columns to class/user/student for safer operational recovery.
- Add immutable ledger constraints for savings and payment history.
- Move long exports to `ReportJob` table plus worker.
- Add `updatedAt` to high-change entities for cache invalidation and sync.

## 6. Caching Strategy

### Current Safe Default

Financial and identity endpoints use `Cache-Control: no-store`. This prevents stale admin data after creating classes/users and avoids browser/proxy reuse of sensitive responses.

### Near-Term Read Cache

Use short private cache only for read-heavy, non-sensitive aggregates:

- dashboard summary: `private, max-age=15, stale-while-revalidate=30`
- monthly report overview: `private, max-age=30, stale-while-revalidate=60`
- reference lists such as academic-year options: `private, max-age=300`

### Future Redis Cache

Keys should include role scope and class/tenant scope:

```text
dashboard:v1:{tenantId}:{role}:{userId}:{month}
class-summary:v1:{tenantId}:{classId}:{year}:{month}
report-overview:v1:{tenantId}:{year}:{month}
```

Invalidation should happen on writes:

- class create/delete: invalidate admin class list and report overview.
- student create/status change: invalidate class summary and reports.
- payment toggle: invalidate class summary, payment checklist, reports.
- expense create/delete: invalidate class summary and reports.
- savings transaction/withdrawal: invalidate savings dashboard and student balance.

## 7. Production Implementation Notes

### Minimal Implementation in This Repo

The current implementation adds:

- `src/lib/cache.ts` for shared HTTP cache policies.
- `src/lib/api.ts` for consistent JSON responses.
- `src/lib/password.ts` for centralized password hashing with environment-controlled cost.
- `src/lib/services/adminClasses.ts` for class read/write business logic.
- `GET|POST /api/admin/classes` refactored to use the service layer.
- Login hash migration: existing bcrypt hashes are rehashed after successful login if their rounds differ from `PASSWORD_HASH_ROUNDS`.

This is intentionally small: it proves the boundary pattern and can be repeated endpoint by endpoint without a risky big-bang rewrite.

### Operational Baseline

- Run behind HTTPS only.
- Run `next build` and `next start` for public access; never expose `next dev` through Cloudflare Tunnel except for testing.
- Use managed MySQL with automated backups and point-in-time recovery.
- Use connection pooling for Prisma in production.
- Configure object storage lifecycle rules for old uploaded receipts.
- Capture structured logs with request ID, actor ID, role, class ID, action, and duration.
- Add alerting for login failure spikes, API 5xx rate, DB latency, and failed report jobs.
- Add rate limiting to auth and upload endpoints.
