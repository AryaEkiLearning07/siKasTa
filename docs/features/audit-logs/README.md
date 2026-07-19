# Audit Logs

## Purpose

Fitur audit logs menyediakan jejak aktivitas sistem, termasuk hash chain untuk memeriksa integritas log.

## Main Entry Points

- UI: `src/app/admin/log/page.tsx`
- API list: `src/app/api/admin/logs/route.ts`
- API export: `src/app/api/admin/logs/export/route.ts`
- Audit infrastructure: `src/lib/audit.ts`

## Data Model Ownership

- `AuditLog`

## Business Rules

- Mutasi penting harus menulis audit log.
- Financial mutation uses `KEUANGAN`.
- Management mutation uses `MANAJEMEN`.
- Auth events use `AUTH`.
- Hash chain must be verifiable from genesis to latest log.

## Security Notes

- Audit log should be append-only from product flows.
- Do not expose full sensitive metadata in public endpoints.
- Request ID, IP, and user agent should be included where available.

## Extension Checklist

- Move list/export filters into `src/features/audit/application`.
- Add test for hash verification on tampered row.
- Add retention policy before long-running production use.
