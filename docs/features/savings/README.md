# Savings

## Purpose

Fitur savings mengatur tabungan siswa, setoran, permintaan penarikan, persetujuan, penolakan, dan ledger transaksi.

## Main Entry Points

- UI: `src/components/domain/SavingsManagement.tsx`
- API overview: `src/app/api/classes/[id]/savings/route.ts`
- API deposit: `src/app/api/classes/[id]/savings/transactions/route.ts`
- API withdrawal request: `src/app/api/classes/[id]/savings/withdrawals/route.ts`
- API withdrawal process: `src/app/api/classes/[id]/savings/withdrawals/[withdrawalId]/route.ts`

## Data Model Ownership

- `SavingsAccount`
- `SavingsTransaction`
- `WithdrawalRequest`
- Reads `Student`

## Business Rules

- Every student should have one savings account.
- Deposit increases balance.
- Approved withdrawal creates a withdrawal transaction.
- Rejected withdrawal must include rejection reason.
- Approval requires handover confirmation.
- Balance is derived from transaction totals, not stored as a mutable field.

## Audit Notes

- Deposits and withdrawals are financial events and must write audit logs.
- Reversal logic must preserve original transaction reference.
- Do not delete ledger rows in production flows.

## Extension Checklist

- Move savings route logic into `src/features/savings/application`.
- Add repository functions for balance calculations.
- Add tests for insufficient balance, duplicate processing, and rejection reason.
