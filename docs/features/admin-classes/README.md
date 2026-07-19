# Admin Class Management

## Purpose

Fitur ini mengatur pembuatan, listing, detail, penghapusan, dan pengarsipan kelas aktif per tahun ajaran.

## Main Entry Points

- UI console: `src/components/admin/AdminConsole.tsx`
- UI class components: `src/components/admin/ClassComponents.tsx`
- API list/create: `src/app/api/admin/classes/route.ts`
- API detail/delete: `src/app/api/admin/classes/[id]/route.ts`
- Current service: `src/lib/services/adminClasses.ts`

## Data Model Ownership

- `Class`
- `User.classId` for wali kelas and bendahara assignment.
- Related counts from `Student`.

## Business Rules

- Only admin can create or delete class data.
- Kepala sekolah can read class list but cannot mutate.
- Class uniqueness is `(name, tahunAjaran)`.
- Active UI should filter out archived classes unless explicitly needed.

## Audit Notes

- Class creation writes `class_created`.
- Class deletion/archive flows must write management audit events.
- Include old and new values when changing configuration.

## Extension Checklist

- Move remaining class detail/update/delete logic into `src/features/classes/application`.
- Keep class-scope authorization centralized.
- Add tests for duplicate class, archive behavior, and member assignment constraints.
