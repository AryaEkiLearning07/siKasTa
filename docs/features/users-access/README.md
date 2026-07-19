# User and Access Management

## Purpose

Fitur ini mengatur akun admin, kepala sekolah, wali kelas, bendahara, dan penempatan user ke kelas.

## Main Entry Points

- UI: `src/components/admin/UserComponents.tsx`
- Admin API: `src/app/api/admin/users/route.ts`
- Legacy user API: `src/app/api/users/route.ts`
- Class account API: `src/app/api/classes/[id]/accounts/route.ts`
- Password reset/change API: `src/app/api/classes/[id]/accounts/[userId]/password/route.ts`
- Role helpers: `src/lib/roles.ts`
- Authorization helpers: `src/lib/authorize.ts`

## Data Model Ownership

- `User`
- `Session`
- `Class.members`

## Business Rules

- Admin creates administrative users and class-scoped users.
- Wali kelas and bendahara are scoped by `classId`.
- Class-scoped users must not access another class.
- Deleting a user must clean up sessions and preserve audit trace.

## Security Notes

- Never return password hashes.
- Password changes should invalidate existing sessions for that user.
- Keep role checks server-side even if UI hides buttons.

## Extension Checklist

- Consolidate duplicate admin/user route logic into one application service.
- Add uniqueness tests for username.
- Add tests for class assignment conflicts.
- Document any new role in `src/lib/roles.ts`, middleware, and feature README.
