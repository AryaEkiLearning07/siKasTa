# SPENSAKAS - Sistem Kas Kelas SPENSAGU

## Tech Stack
- **Framework**: Next.js 14 (App Router), TypeScript
- **Database**: MySQL XAMPP via Prisma ORM
- **Auth**: Username/password with session-based httpOnly cookie
- **Storage**: Cloudflare R2 (S3-compatible)
- **Styling**: Tailwind CSS

> Catatan arsitektur: dokumen PKKT v2 menyebut Supabase/PostgreSQL, RLS, dan RPC.
> Implementasi repo ini tetap memakai MySQL XAMPP + Prisma. Isolasi akses,
> kalkulasi saldo, approval, audit log, dan lifecycle data dilakukan di
> route handler/server code, bukan RLS/RPC Supabase.

## Project Structure

```text
src/
|-- app/
|   |-- api/
|   |   |-- admin/           # Admin API routes
|   |   |-- auth/            # Auth routes (login, logout, me)
|   |   |-- classes/         # Class-scoped routes
|   |   |-- payments/        # Payment toggle
|   |   |-- reports/         # Reports (overview, export)
|   |   `-- uploads/         # Presigned URL for R2
|   |-- admin/               # Admin dashboard pages
|   |-- bendahara/           # Bendahara class pages
|   |-- ketua-kelas/         # Ketua kelas class pages
|   |-- kepala-sekolah/      # Kepala sekolah pages
|   |-- wali-kelas/          # Wali kelas class pages
|   `-- login/               # Login page
|-- components/
|   |-- admin/               # Admin account/class components
|   |-- class/               # Class dashboard components
|   |-- domain/              # Business components
|   |-- layouts/             # Main layouts with nav
|   `-- ui/                  # Design system components
`-- lib/
    |-- auth.ts              # Session management
    |-- authorize.ts         # Permission checks
    |-- prisma.ts            # Prisma client
    |-- routes.ts            # Role route helpers
    |-- utils.ts             # Utility functions
    `-- validations.ts       # Zod schemas
```

## Roles

| Role | Permissions |
|------|-------------|
| ADMIN | Manage classes and create wali kelas accounts |
| KEPALA_SEKOLAH | View all classes (read-only), export |
| WALI_KELAS | Manage class config, students, and create bendahara account for own class |
| BENDAHARA | Toggle payments, record expenses |
| KETUA_KELAS | View only |

## API Endpoints

### Auth
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/admin/users` - List users (admin only)
- `POST /api/users` - Create wali kelas account as admin, or bendahara account as wali kelas
- `DELETE /api/users?id=:id` - Remove a managed account assignment

### Admin
- `GET /api/admin/classes` - List all classes
- `POST /api/admin/classes` - Create class
- `DELETE /api/admin/classes/:id/wali-kelas` - Remove wali kelas

### Class-scoped
- `GET /api/classes/:id` - Get class
- `PATCH /api/classes/:id` - Update class (kasNominal)
- `GET /api/classes/:id/students` - List students
- `POST /api/classes/:id/students` - Add student
- `GET /api/classes/:id/expenses` - List expenses
- `POST /api/classes/:id/expenses` - Create expense
- `GET /api/classes/:id/saldo` - Get saldo summary
- `GET /api/classes/:id/savings` - Get class savings summary
- `POST /api/classes/:id/savings/transactions` - Record savings deposit
- `GET /api/classes/:id/savings/withdrawals` - List withdrawal requests
- `POST /api/classes/:id/savings/withdrawals` - Create withdrawal request
- `PATCH /api/classes/:id/savings/withdrawals/:withdrawalId` - Approve/reject withdrawal

### Payments
- `POST /api/payments/toggle` - Toggle payment status

### Reports
- `GET /api/reports/overview` - Overview all classes
- `GET /api/reports/export` - Export CSV

### Uploads
- `POST /api/uploads/presign` - Get presigned URL

## Setup

```bash
# Install dependencies
npm install

# Start Apache/MySQL in XAMPP, then create database `spensakas`
# in phpMyAdmin or MySQL CLI.

# Copy env and configure for XAMPP
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database
npm run db:seed

# Start development server
npm run dev
```

## Default Credentials

- Admin: `admin` / `aryaeki0707`
- Kepala Sekolah seed: `kepala-sekolah` / `kepala123`

## Database Notes

- Default XAMPP connection is `mysql://root@localhost:3306/spensakas`.
- If MySQL in XAMPP uses a password or different port, update `DATABASE_URL`.
- Role constraints such as one wali kelas per class and one bendahara per class are enforced in API routes because MySQL does not support partial unique indexes.
- Savings balances are calculated from `SavingsTransaction` rows; they are not stored as mutable balance columns.
- Student creation/import also creates a `SavingsAccount` in application code because this project does not use PostgreSQL triggers.
