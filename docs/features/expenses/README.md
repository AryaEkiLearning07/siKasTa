# Expenses

## Purpose

Fitur expenses mengatur pengeluaran kelas, termasuk bukti foto opsional dan audit penghapusan.

## Main Entry Points

- UI form: `src/components/domain/ExpenseForm.tsx`
- UI list: `src/components/domain/ExpenseList.tsx`
- API list/create: `src/app/api/classes/[id]/expenses/route.ts`
- API delete: `src/app/api/classes/[id]/expenses/[expenseId]/route.ts`
- Use case: `src/features/expenses/application/expensesUseCase.ts`

## Data Model Ownership

- `Expense`
- Reads `User` as `recordedBy`
- Optional upload URL from uploads feature

## Business Rules

- Only bendahara can read, create, and delete expenses.
- Bendahara can mutate only expenses in their assigned class.
- Amount must be greater than zero.
- Category must be one of Prisma `ExpenseCategory`.
- Monthly filter uses `spentAt`.

## Audit Notes

- Create writes `expense_created`.
- Delete writes `expense_deleted` with high severity.
- Delete audit preserves old values before the row is removed.

## Extension Checklist

- If editing expenses is added, write old/new audit values.
- Consider soft delete before production with strict financial audit requirements.
- Add tests for class-scope deletion rejection.
