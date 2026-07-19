# Payments

## Purpose

Fitur payments mengatur checklist pembayaran kas bulanan per siswa aktif.

## Main Entry Points

- UI table: `src/components/domain/PaymentChecklistTable.tsx`
- API toggle: `src/app/api/payments/toggle/route.ts`
- Use case: `src/features/payments/application/togglePaymentUseCase.ts`

## Data Model Ownership

- `Payment`
- Reads `Student.status`
- Reads `Class.kasNominal`

## Business Rules

- Only bendahara can toggle payment.
- Bendahara can mutate only students in their assigned class.
- Payments can only be toggled for students with status `AKTIF`.
- Amount is copied from class `kasNominal` at toggle time.
- `(studentId, year, month)` is unique.

## Audit Notes

- New rows write `payment_created`.
- Existing rows write `payment_updated`.
- Audit metadata includes student, year, and month.
- Old and new values include paid state, amount, and paid time.

## Extension Checklist

- If supporting payment history, do not mutate the current row directly without ledger design.
- Add tests for inactive student rejection.
- Add tests for class-scope rejection.
