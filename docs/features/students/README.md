# Students

## Purpose

Fitur students mengatur daftar siswa, tambah siswa, import siswa, perubahan status siswa, dan hubungan awal ke tabungan.

## Main Entry Points

- UI management: `src/components/class/StudentManagement.tsx`
- UI list: `src/components/class/StudentList.tsx`
- API list/create/import: `src/app/api/classes/[id]/students/route.ts`
- API delete: `src/app/api/students/[id]/route.ts`
- API status: `src/app/api/students/[id]/status/route.ts`
- Use case: `src/features/students/application/studentsUseCase.ts`

## Data Model Ownership

- `Student`
- `SavingsAccount` initial creation for each student.
- Related `Payment` rows when reading monthly payment status.

## Business Rules

- Only wali kelas can add or import students.
- Wali kelas can mutate only their assigned class.
- Import accepts up to 500 students.
- `BEBAS_KAS` requires a status reason.
- New students automatically receive a savings account.

## Audit Notes

- Single create writes `student_created`.
- Import writes `students_imported` with count.
- Status changes and delete flows must include old/new value audit entries.

## Extension Checklist

- Move delete and status routes into `features/students/application`.
- Add duplicate NISN policy if the school decides NISN must be unique.
- Add tests for import validation and savings account creation.
