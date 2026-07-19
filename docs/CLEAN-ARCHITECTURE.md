# Clean Architecture Guide

Dokumen ini menjelaskan struktur baru yang mulai diterapkan agar siKaTa lebih mudah diskalakan tanpa mengubah behavior produk.

## Target Folder Structure

```text
src/
  app/                         Next.js routes, layouts, pages, and API adapters
    api/                       HTTP boundary only: session, params, request body, response
  components/                  UI components grouped by role/domain
    admin/
    class/
    domain/
    layouts/
    ui/
  core/                        Cross-feature primitives with no product-specific workflow
    audit/
      context.ts               Request audit contract shared by use cases
    errors.ts                  Operational application errors
    http/
      errors.ts                HTTP error adapter
  features/                    Feature-oriented application layer
    auth/
      application/
      README.md
    expenses/
      application/
      README.md
    finance/
      application/
      README.md
    payments/
      application/
      README.md
    students/
      application/
      README.md
  lib/                         Existing infrastructure and compatibility modules
    prisma.ts                  Prisma client
    audit.ts                   Audit log writer and verifier
    auth.ts                    Session cookie/session table integration
    validations.ts             Zod schemas shared by adapters/use cases
    services/                  Legacy services to migrate gradually
prisma/
  schema.prisma                Database source of truth
docs/
  features/                    Per-feature maintenance README files
```

## Dependency Rule

Dependencies point inward:

```text
app/api route -> feature/application -> core + lib/infrastructure -> database/external services
```

Rules:

- API routes must not hold business workflows.
- Feature use cases own authorization decisions, transactions, audit events, and business invariants.
- `core` may not import feature code.
- UI components call API endpoints, not Prisma or feature use cases directly.
- Prisma access currently lives in application services for pragmatic migration. New high-complexity features should add `infrastructure` repositories inside their feature folder.

## Layer Responsibilities

### HTTP Adapter: `src/app/api`

Allowed:

- Read route params and query params.
- Read request JSON.
- Resolve current user/session.
- Call one use case.
- Return JSON response.

Avoid:

- Direct Prisma writes.
- Multi-step transactions.
- Audit event construction.
- Complex role branching.

### Application Layer: `src/features/*/application`

Allowed:

- Validate input using shared schemas.
- Enforce role and class-scope rules.
- Run Prisma transactions.
- Write audit logs.
- Return route-ready DTOs that preserve existing API response shapes.

Avoid:

- Next.js `NextRequest` or `NextResponse`.
- Browser-only code.
- UI text formatting that belongs to components.

### Core: `src/core`

Allowed:

- Stable cross-feature contracts.
- Operational errors.
- HTTP error mapping helpers.
- Request audit context types.

Avoid:

- Product-specific workflows such as payments, students, or savings.

### Infrastructure: `src/lib`

Current responsibility:

- Prisma client singleton.
- Session cookies and session table integration.
- Audit hash chain.
- Shared validation schemas.
- Shared response/cache helpers.

Migration rule: leave existing imports stable, then move logic feature by feature when touching that feature.

## Current Refactor Boundary

The first architecture pass moved these workflows out of routes:

- Login credential validation and audit outcomes.
- Payment toggle workflow.
- Student list/create/import workflow.
- Expense list/create/delete workflow.
- Class saldo aggregation workflow.

This is intentionally incremental. Routes keep the same URL and response payloads so the UI behavior remains unchanged.

## Adding a New Feature

1. Create `src/features/<feature>/application/<useCase>.ts`.
2. Keep route code thin in `src/app/api/.../route.ts`.
3. Put cross-feature types in `src/core` only if at least two features need them.
4. Add or update `docs/features/<feature>/README.md`.
5. Run:

```powershell
npx tsc --noEmit
```

6. If a change touches financial data, include an audit log event and document the invariant.

## Migration Checklist For Existing Routes

- Find direct `prisma.*` calls in a route.
- Move the workflow into `src/features/<feature>/application`.
- Keep the route response body identical.
- Preserve status codes and user-facing error messages.
- Move audit construction into the use case.
- Run type-check before and after.

## Architectural Improvements In This Pass

- Replaced repeated route-level error handling with `AppError` plus HTTP mapping.
- Introduced request audit context so use cases do not depend on `NextRequest`.
- Consolidated payment, student, expense, and saldo workflows behind feature use cases.
- Cleaned audit JSON typing so the whole project passes TypeScript checking.
- Added feature documentation to reduce future onboarding and maintenance cost.
