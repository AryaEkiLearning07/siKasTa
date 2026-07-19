# Academic Year Migration

## Purpose

Fitur ini memindahkan struktur kelas dari satu tahun ajaran ke tahun ajaran berikutnya, mengarsipkan kelas lama, dan menyiapkan kelas target.

## Main Entry Points

- UI: `src/components/admin/MigrationConsole.tsx`
- Preview API: `src/app/api/admin/migrations/academic-year/preview/route.ts`
- Execute API: `src/app/api/admin/migrations/academic-year/execute/route.ts`
- Service: `src/lib/services/academicYearMigration.ts`

## Data Model Ownership

- `MigrationJob`
- `Class`
- `Student`
- Backfill relation to `Payment.classId`

## Business Rules

- Source and target academic year must differ.
- Execution requires confirmation text.
- Existing completed migration should prevent duplicate destructive work.
- Old classes become archived.
- Sessions are cleared after migration.

## Operational Notes

- Prefer running execution in a low-traffic maintenance window.
- Preview must be reviewed before execute.
- Backup database before executing in real production.

## Extension Checklist

- Move migration service into `src/features/academic-year-migration/application`.
- Add dry-run diff export.
- Add tests for duplicate target class and failed transaction rollback.
