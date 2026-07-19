# Class Profile and Dashboard

## Purpose

Fitur ini menyediakan detail kelas, konfigurasi nominal kas, dashboard kelas, dan ringkasan saldo.

## Main Entry Points

- UI dashboard: `src/components/class/ClassDashboard.tsx`
- UI saldo card: `src/components/domain/SaldoSummaryCard.tsx`
- API class detail/update: `src/app/api/classes/[id]/route.ts`
- API saldo: `src/app/api/classes/[id]/saldo/route.ts`
- Saldo use case: `src/features/finance/application/classSaldoUseCase.ts`

## Data Model Ownership

- `Class.kasNominal`
- Aggregates from `Payment` and `Expense`

## Business Rules

- Admin and kepala sekolah can read any class.
- Wali kelas and bendahara can read only assigned class.
- Only wali kelas can update class cash nominal.
- Saldo monthly view requires `year` and `month`.

## Audit Notes

- Cash nominal changes write `class_cash_nominal_updated`.
- Saldo read is not audited because it does not mutate financial data.

## Extension Checklist

- Move class update workflow into `src/features/classes/application`.
- Keep aggregate formulas in one use case.
- Add tests for legacy payments with `classId: null`.
