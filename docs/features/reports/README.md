# Reports

## Purpose

Fitur reports menyediakan overview bulanan lintas kelas dan export untuk kepala sekolah atau admin.

## Main Entry Points

- UI: `src/app/kepala-sekolah/page.tsx`
- API overview: `src/app/api/reports/overview/route.ts`
- API export: `src/app/api/reports/export/route.ts`
- Report service: `src/lib/reports.ts`

## Data Model Ownership

- Aggregates `Class`, `Student`, `Payment`, and `Expense`.

## Business Rules

- Report monthly view uses `year` and `month`.
- Only active classes are included in current report.
- Paid count only counts active students.
- Legacy payments with `classId: null` are attributed through `student.classId`.

## Security Notes

- Reports contain financial information; keep endpoints role-protected.
- Export should not be cached publicly.

## Extension Checklist

- Move report generation into `src/features/reports/application`.
- Add pagination or worker jobs for large exports.
- Add tests for empty class list and mixed active/bebas kas students.
