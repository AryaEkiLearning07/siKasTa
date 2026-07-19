# Dokumentasi Lengkap Proyek siKasta

Dokumen ini dibuat sebagai peta belajar untuk memahami proyek siKasta, terutama karena sebagian besar kode lahir dari proses vibe coding. Fokusnya adalah menjelaskan tech stack, struktur folder, fungsi file, alur data, database, dan catatan kebersihan proyek.

## 1. Ringkasan Proyek

siKasta adalah aplikasi web untuk mengelola kas kelas dan tabungan siswa SMP Negeri 1 Dlanggu.

Fitur utama:

- Login berbasis role.
- Dashboard sesuai role pengguna.
- Manajemen kelas dan akun.
- Manajemen siswa.
- Checklist pembayaran kas bulanan.
- Pencatatan pengeluaran kelas dengan bukti foto.
- Laporan pemasukan, pengeluaran, saldo, dan persentase lunas.
- Tabungan siswa, termasuk setoran dan pengajuan penarikan.
- Migrasi tahun ajaran.
- Audit log dengan hash chain untuk mendeteksi perubahan riwayat log.

Role pengguna:

| Role | Fungsi utama |
| --- | --- |
| `ADMIN` | Mengelola kelas, akun, migrasi tahun ajaran, dan audit log. |
| `KEPALA_SEKOLAH` | Melihat laporan rekap seluruh kelas. |
| `WALI_KELAS` | Mengelola siswa, nominal kas kelas, tabungan siswa, dan menyetujui penarikan. |
| `BENDAHARA` | Mencatat pembayaran kas, pengeluaran, dan mengajukan penarikan tabungan. |

## 2. Tech Stack

| Area | Teknologi | Keterangan |
| --- | --- | --- |
| Framework web | Next.js 14.2.5 | Menggunakan App Router di `src/app`. |
| UI | React 18.3.1 | Komponen client/server sesuai pola Next.js. |
| Styling | Tailwind CSS 3.4.6 | Konfigurasi brand ada di `tailwind.config.js` dan `src/app/globals.css`. |
| Database ORM | Prisma 5.18.0 | Schema ada di `prisma/schema.prisma`. |
| Database | MySQL | Default `.env.example` memakai MySQL lokal/XAMPP. |
| Validasi input | Zod 3.23.8 | Schema validasi ada di `src/lib/validations.ts`. |
| Password hashing | bcryptjs | Helper ada di `src/lib/password.ts`. |
| File upload | AWS SDK S3 compatible | Dipakai untuk Cloudflare R2 melalui presigned URL. |
| Spreadsheet | xlsx | Dipakai untuk import/export data Excel. |
| TypeScript | TypeScript 5.5.4 | `strict: true`, namun `allowJs: true` masih aktif. |

## 3. Script NPM

| Script | Perintah | Fungsi |
| --- | --- | --- |
| `npm run dev` | `next dev` | Menjalankan server development. |
| `npm run build` | `next build` | Build production. |
| `npm run start` | `next start` | Menjalankan hasil build production. |
| `npm run lint` | `next lint` | Menjalankan lint Next.js. |
| `npm run db:generate` | `prisma generate` | Generate Prisma Client. |
| `npm run db:push` | `prisma db push` | Sinkronisasi schema ke database tanpa migration file. |
| `npm run db:migrate` | `prisma migrate dev` | Membuat/menerapkan migration untuk development. |
| `npm run db:seed` | `tsx prisma/seed.ts` | Mengisi data awal development. |
| `npm run db:studio` | `prisma studio` | Membuka UI database Prisma. |

Catatan penting:

- Belum ada script test otomatis.
- Belum terlihat folder `prisma/migrations`, jadi workflow deployment production perlu dipastikan lagi. Untuk production lebih aman memakai migration yang tercatat, bukan hanya `db push`.

## 4. Environment Variable

Contoh env ada di `.env.example`.

| Variable | Fungsi |
| --- | --- |
| `DATABASE_URL` | URL koneksi MySQL untuk Prisma. |
| `PASSWORD_HASH_ROUNDS` | Jumlah bcrypt rounds, default helper fallback ke 10. |
| `R2_ACCOUNT_ID` | Account ID Cloudflare R2. |
| `R2_ACCESS_KEY_ID` | Access key untuk upload R2. |
| `R2_SECRET_ACCESS_KEY` | Secret key untuk upload R2. |
| `R2_BUCKET_NAME` | Nama bucket R2. |
| `R2_PUBLIC_URL` | URL publik untuk file yang sudah diupload. |

Jangan commit isi `.env` asli. File `.env.example` boleh dipakai sebagai template.

## 5. Arsitektur Umum

Proyek ini memakai Next.js App Router dengan pembagian bertahap:

```text
Request browser
  -> src/middleware.ts untuk proteksi halaman
  -> src/app/.../page.tsx untuk halaman
  -> src/app/api/.../route.ts untuk endpoint API
  -> src/features/.../application untuk sebagian use case bisnis
  -> src/lib untuk helper infrastruktur dan shared logic
  -> prisma melalui src/lib/prisma.ts
  -> MySQL
```

Pola arsitektur yang sedang dibangun:

- `src/app` bertindak sebagai layer delivery/UI dan HTTP adapter.
- `src/features/*/application` berisi use case bisnis yang sudah mulai dipisahkan dari Next.js.
- `src/lib` berisi infrastruktur dan helper bersama.
- `src/core` berisi tipe/error yang lebih framework-agnostic.
- `prisma/schema.prisma` adalah sumber struktur database.

Catatan belajar:

- Beberapa fitur seperti siswa, pembayaran, pengeluaran, saldo, auth, dan admin classes sudah memakai use case.
- Beberapa fitur tabungan masih cukup banyak logic bisnis langsung di route API. Ini bisa menjadi target refactor berikutnya.

## 6. Struktur Folder Root

| Path | Keterangan |
| --- | --- |
| `.env` | Env lokal asli. Jangan didokumentasikan isinya dan jangan dicommit. |
| `.env.example` | Template env untuk developer/deployment. |
| `.next/` | Output/cache Next.js. Generated, tidak perlu dipelajari sebagai source. |
| `node_modules/` | Dependency hasil `npm install`. Generated. |
| `docs/` | Dokumentasi teknis proyek dan fitur. |
| `prisma/` | Schema database dan seed data. |
| `public/` | Asset publik seperti logo dan favicon. |
| `src/` | Source code utama aplikasi. |
| `package.json` | Metadata proyek, dependency, dan script. |
| `package-lock.json` | Lockfile dependency npm. Penting untuk instalasi konsisten. |
| `next.config.js` | Konfigurasi Next.js, termasuk remote image untuk R2. |
| `tsconfig.json` | Konfigurasi TypeScript dan alias `@/*`. |
| `tailwind.config.js` | Konfigurasi Tailwind, warna brand, font, shadow. |
| `postcss.config.js` | Integrasi Tailwind dan Autoprefixer. |
| `next-env.d.ts` | File tipe otomatis Next.js. |
| `CLAUDE.md` | Catatan/instruksi lokal untuk agent atau proses pengembangan. |
| `PANDUAN-PUBLIC-DOMAIN-CLOUDFLARE-TUNNEL.md` | Panduan expose domain publik dengan Cloudflare Tunnel. |

## 7. Struktur `src`

| Path | Keterangan |
| --- | --- |
| `src/app/` | Route halaman dan API Next.js App Router. |
| `src/components/` | Komponen UI, layout, dan domain. |
| `src/core/` | Primitive error dan context yang lebih generik. |
| `src/features/` | Use case bisnis per fitur. |
| `src/lib/` | Helper, service, auth, Prisma, validasi, audit, dan utilitas. |
| `src/middleware.ts` | Middleware proteksi halaman berbasis session cookie. |

## 8. Detail `src/app`

### File halaman utama

| File | Keterangan |
| --- | --- |
| `src/app/layout.tsx` | Root layout aplikasi. Memasang `RouteLoadingProvider` dan `ToastProvider`. |
| `src/app/globals.css` | CSS global, Tailwind base, token warna brand, font, scrollbar, focus, animasi. |
| `src/app/page.tsx` | Halaman root. Mengecek user lalu redirect ke dashboard sesuai role. |
| `src/app/login/page.tsx` | Form login client-side. Memanggil `/api/auth/login`, lalu redirect ke dashboard role. |

### Area admin

| File | Keterangan |
| --- | --- |
| `src/app/admin/layout.tsx` | Layout protected untuk role `ADMIN`, memakai `AppLayout`. |
| `src/app/admin/page.tsx` | Redirect/entry admin sederhana. |
| `src/app/admin/kelas/page.tsx` | Halaman admin untuk manajemen kelas. |
| `src/app/admin/akun/page.tsx` | Halaman admin untuk manajemen akun. |
| `src/app/admin/migrasi/page.tsx` | Halaman admin untuk migrasi tahun ajaran. |
| `src/app/admin/log/page.tsx` | Halaman audit log admin, termasuk filter dan tampilan detail log. |

### Area kepala sekolah

| File | Keterangan |
| --- | --- |
| `src/app/kepala-sekolah/layout.tsx` | Layout role `KEPALA_SEKOLAH`. |
| `src/app/kepala-sekolah/page.tsx` | Dashboard laporan seluruh kelas. |

### Area wali kelas

| File | Keterangan |
| --- | --- |
| `src/app/wali-kelas/[classId]/layout.tsx` | Layout role `WALI_KELAS` untuk kelas tertentu. |
| `src/app/wali-kelas/[classId]/page.tsx` | Dashboard kas kelas untuk wali kelas. |
| `src/app/wali-kelas/[classId]/siswa/page.tsx` | Manajemen siswa kelas. |
| `src/app/wali-kelas/[classId]/pengeluaran/page.tsx` | Halaman pengeluaran versi wali kelas/read-only. |
| `src/app/wali-kelas/[classId]/tabungan/page.tsx` | Manajemen tabungan siswa. |
| `src/app/wali-kelas/[classId]/pengaturan/page.tsx` | Pengaturan kelas seperti nominal kas dan akun bendahara. |

### Area bendahara

| File | Keterangan |
| --- | --- |
| `src/app/bendahara/[classId]/layout.tsx` | Layout role `BENDAHARA` untuk kelas tertentu. |
| `src/app/bendahara/[classId]/page.tsx` | Dashboard kas kelas untuk bendahara. |
| `src/app/bendahara/[classId]/pengeluaran/page.tsx` | Pencatatan dan daftar pengeluaran kelas. |

## 9. Detail Endpoint API

Semua endpoint berada di `src/app/api`.

### Auth

| File | Method | Fungsi |
| --- | --- | --- |
| `src/app/api/auth/login/route.ts` | `POST` | Login, validasi credential, membuat session cookie, mencatat audit login. |
| `src/app/api/auth/logout/route.ts` | `POST` | Menghapus session user. |
| `src/app/api/auth/me/route.ts` | `GET` | Mengembalikan user saat ini berdasarkan session. |

### Admin

| File | Method | Fungsi |
| --- | --- | --- |
| `src/app/api/admin/classes/route.ts` | `GET`, `POST` | List dan membuat kelas admin. |
| `src/app/api/admin/classes/[id]/route.ts` | `PATCH`, `DELETE` | Update/hapus kelas admin. |
| `src/app/api/admin/classes/[id]/wali-kelas/route.ts` | `POST` | Assign wali kelas ke kelas. |
| `src/app/api/admin/users/route.ts` | `GET`, `POST`, `PATCH`, `DELETE` | CRUD akun user. |
| `src/app/api/admin/logs/route.ts` | `GET` | List audit log dan verifikasi hash chain. |
| `src/app/api/admin/logs/export/route.ts` | `GET` | Export audit log. |
| `src/app/api/admin/migrations/academic-year/preview/route.ts` | `POST` | Preview migrasi tahun ajaran. |
| `src/app/api/admin/migrations/academic-year/execute/route.ts` | `POST` | Eksekusi migrasi tahun ajaran. |

### Class scoped

| File | Method | Fungsi |
| --- | --- | --- |
| `src/app/api/classes/[id]/route.ts` | `GET`, `PATCH` | Detail kelas dan update nominal kas. |
| `src/app/api/classes/[id]/students/route.ts` | `GET`, `POST` | List, tambah, dan import siswa. |
| `src/app/api/classes/[id]/accounts/route.ts` | `GET`, `POST` | Akun kelas, terutama bendahara/wali kelas. |
| `src/app/api/classes/[id]/accounts/[userId]/password/route.ts` | `PATCH` | Reset/update password akun kelas. |
| `src/app/api/classes/[id]/expenses/route.ts` | `GET`, `POST` | List dan membuat pengeluaran. |
| `src/app/api/classes/[id]/expenses/[expenseId]/route.ts` | `DELETE` | Hapus pengeluaran. |
| `src/app/api/classes/[id]/saldo/route.ts` | `GET` | Ringkasan saldo kelas per bulan dan saldo terkini. |
| `src/app/api/classes/[id]/savings/route.ts` | `GET` | Dashboard tabungan kelas. Membuat savings account yang belum ada. |
| `src/app/api/classes/[id]/savings/transactions/route.ts` | `POST` | Mencatat setoran tabungan. |
| `src/app/api/classes/[id]/savings/withdrawals/route.ts` | `GET`, `POST` | List dan membuat pengajuan penarikan tabungan. |
| `src/app/api/classes/[id]/savings/withdrawals/[withdrawalId]/route.ts` | `PATCH` | Proses persetujuan/penolakan penarikan. |

### Siswa, pembayaran, laporan, upload

| File | Method | Fungsi |
| --- | --- | --- |
| `src/app/api/students/[id]/route.ts` | `PATCH`, `DELETE` | Update/hapus siswa. |
| `src/app/api/students/[id]/status/route.ts` | `PATCH` | Update status siswa seperti aktif, bebas kas, pindah. |
| `src/app/api/payments/toggle/route.ts` | `POST` | Toggle status pembayaran kas bulanan siswa. |
| `src/app/api/reports/overview/route.ts` | `GET` | Laporan ringkas bulanan semua kelas. |
| `src/app/api/reports/export/route.ts` | `GET` | Export laporan. |
| `src/app/api/uploads/presign/route.ts` | `POST` | Membuat presigned upload URL untuk Cloudflare R2. |
| `src/app/api/users/route.ts` | `GET`, `POST`, `PATCH`, `DELETE` | API user lama/umum. Ada overlap dengan admin users. |

## 10. Detail `src/components`

### Layout

| File | Keterangan |
| --- | --- |
| `src/components/layouts/AppLayout.tsx` | Layout utama aplikasi setelah login: navbar, mobile sidebar, role navigation, logout, footer. |
| `src/components/AppLayout.tsx` | Wrapper layout lama yang fetch `/api/auth/me` sendiri lalu memakai `components/layouts/AppLayout`. Dari pencarian internal, file ini tampak tidak dipakai langsung oleh route saat ini. |

### Komponen admin

| File | Keterangan |
| --- | --- |
| `src/components/admin/AdminConsole.tsx` | Container utama admin untuk section kelas/akun. |
| `src/components/admin/ClassComponents.tsx` | Komponen daftar kelas, form kelas, dan assignment wali kelas/bendahara. |
| `src/components/admin/UserComponents.tsx` | Tabel user, modal user, dan dialog hapus user. |
| `src/components/admin/MigrationConsole.tsx` | UI preview dan eksekusi migrasi tahun ajaran. |

### Komponen class/domain

| File | Keterangan |
| --- | --- |
| `src/components/class/ClassDashboard.tsx` | Dashboard kelas untuk wali kelas/bendahara: info kelas, ringkasan saldo, checklist pembayaran. |
| `src/components/class/StudentManagement.tsx` | UI manajemen siswa, termasuk import dari spreadsheet. |
| `src/components/class/StudentList.tsx` | Daftar siswa versi tabel/list. |
| `src/components/class/ExpenseManagement.tsx` | UI pengeluaran kelas dengan upload bukti. |
| `src/components/domain/PaymentChecklistTable.tsx` | Tabel checklist pembayaran kas bulanan. |
| `src/components/domain/SaldoSummaryCard.tsx` | Card ringkasan pemasukan, pengeluaran, saldo bulan, saldo terkini. |
| `src/components/domain/SavingsManagement.tsx` | UI tabungan siswa: saldo, setoran, pengajuan/proses penarikan, histori transaksi. |
| `src/components/domain/ExpenseList.tsx` | List pengeluaran. |
| `src/components/domain/ExpenseCard.tsx` | Card satu item pengeluaran. |
| `src/components/domain/ExpenseForm.tsx` | Form/modal membuat pengeluaran. |

### UI primitives

| File | Keterangan |
| --- | --- |
| `src/components/ui/AssignmentSlot.tsx` | Tampilan slot assignment, juga export `PercentBadge`. |
| `src/components/ui/Badge.tsx` | Badge status/label. |
| `src/components/ui/Button.tsx` | Button reusable dengan variant, size, loading, icon. |
| `src/components/ui/Card.tsx` | Komponen card dan sub-komponen card. |
| `src/components/ui/ConfirmDialog.tsx` | Dialog konfirmasi sederhana. |
| `src/components/ui/DataState.tsx` | State data seperti loading/error/empty. |
| `src/components/ui/DataTable.tsx` | Table reusable. |
| `src/components/ui/EmptyState.tsx` | Komponen empty state. |
| `src/components/ui/FormField.tsx` | Wrapper field kecil. Dari pencarian, belum terlihat dipakai langsung. |
| `src/components/ui/Icon.tsx` | Komponen ikon custom berbasis nama. |
| `src/components/ui/Input.tsx` | Input reusable dengan label/error/helper. |
| `src/components/ui/Modal.tsx` | Modal reusable. |
| `src/components/ui/MoneyValue.tsx` | Tampilan nilai rupiah dengan warna positif/negatif/netral. |
| `src/components/ui/MonthNavigator.tsx` | Navigasi bulan. |
| `src/components/ui/NavLink.tsx` | Link navigasi dengan active state. |
| `src/components/ui/PageHeader.tsx` | Header halaman. |
| `src/components/ui/RouteLoading.tsx` | Provider overlay/progress loading route. |
| `src/components/ui/Select.tsx` | Select reusable. |
| `src/components/ui/Skeleton.tsx` | Placeholder loading skeleton. |
| `src/components/ui/Spinner.tsx` | Spinner loading. |
| `src/components/ui/Tabs.tsx` | Tabs reusable. |
| `src/components/ui/Toast.tsx` | Provider dan hook toast. |
| `src/components/ui/index.ts` | Barrel export komponen UI. |
| `src/components/ui/README.md` | Dokumentasi singkat design system UI. |

## 11. Detail `src/features`

Folder ini berisi use case bisnis yang sudah dipisahkan dari route handler.

| File | Keterangan |
| --- | --- |
| `src/features/README.md` | Menjelaskan boundary feature modules. |
| `src/features/auth/README.md` | Catatan fitur auth. |
| `src/features/auth/application/loginUseCase.ts` | Validasi login, cek maintenance, verifikasi password, upgrade hash, audit login sukses/gagal. |
| `src/features/students/README.md` | Catatan fitur students. |
| `src/features/students/application/studentsUseCase.ts` | List siswa, tambah siswa single/import, buat savings account, audit perubahan siswa. |
| `src/features/payments/README.md` | Catatan fitur payments. |
| `src/features/payments/application/togglePaymentUseCase.ts` | Toggle pembayaran kas, validasi role bendahara, validasi status siswa, upsert payment, audit. |
| `src/features/expenses/README.md` | Catatan fitur expenses. |
| `src/features/expenses/application/expensesUseCase.ts` | List, buat, hapus pengeluaran kelas, validasi bendahara, audit. |
| `src/features/finance/README.md` | Catatan fitur finance. |
| `src/features/finance/application/classSaldoUseCase.ts` | Menghitung pemasukan, pengeluaran, saldo bulan, dan saldo terkini. |

## 12. Detail `src/lib`

| File | Keterangan |
| --- | --- |
| `src/lib/prisma.ts` | Singleton Prisma Client. Di development disimpan di `globalThis` agar tidak membuat banyak koneksi saat hot reload. |
| `src/lib/auth.ts` | Session database + cookie, current user, logout, role guard dasar. |
| `src/lib/authorize.ts` | Guard akses kelas dan role untuk aksi tertentu. |
| `src/lib/roles.ts` | Label role, permission map, status label siswa/pembayaran/kategori pengeluaran. |
| `src/lib/routes.ts` | Helper redirect dashboard berdasarkan role. |
| `src/lib/validations.ts` | Semua schema Zod untuk input API/form. |
| `src/lib/api.ts` | Helper `jsonResponse` dan `jsonError` dengan default cache control. |
| `src/lib/cache.ts` | Definisi cache policy HTTP. |
| `src/lib/audit.ts` | Membuat audit log, hash chain, verifikasi integritas, parsing IP/user-agent/request-id. |
| `src/lib/password.ts` | Hash/verify bcrypt dan deteksi hash yang perlu upgrade rounds. |
| `src/lib/maintenance.ts` | Membaca/menulis status maintenance di `SystemSetting`. |
| `src/lib/reports.ts` | Query laporan bulanan seluruh kelas. |
| `src/lib/utils.ts` | Format rupiah/tanggal, parse rupiah, helper className, initials. |
| `src/lib/format.ts` | Helper placeholder empty value untuk card/table/detail. |
| `src/lib/services/adminClasses.ts` | Service list dan create class admin plus audit. |
| `src/lib/services/academicYearMigration.ts` | Preview dan eksekusi migrasi tahun ajaran, archive kelas, pindah siswa/user/tabungan, maintenance mode. |

## 13. Detail `src/core`

| File | Keterangan |
| --- | --- |
| `src/core/errors.ts` | `AppError`, kode error aplikasi, dan factory `appErrors`. |
| `src/core/http/errors.ts` | Adapter error ke response HTTP JSON. |
| `src/core/audit/context.ts` | Tipe `RequestAuditContext` untuk audit metadata request. |

## 14. Detail `prisma`

| File | Keterangan |
| --- | --- |
| `prisma/schema.prisma` | Definisi datasource MySQL, Prisma Client, enum, model, relasi, index. |
| `prisma/seed.ts` | Seed development: admin, kepala sekolah, contoh kelas, contoh siswa, savings account. |

Catatan seed:

- Seed berisi credential development yang hard-coded.
- Jangan gunakan credential seed di production.
- Sebelum deployment, akun production harus dibuat dengan password baru yang kuat.

## 15. Detail `public`

| File | Keterangan |
| --- | --- |
| `public/logo-spensagu.png` | Logo sekolah untuk login, navbar, favicon metadata. |
| `public/favicon.png` | Favicon publik. |

## 16. Detail `docs`

| File | Keterangan |
| --- | --- |
| `docs/PROJECT-DOCUMENTATION.md` | Dokumen utama ini. |
| `docs/CLEAN-ARCHITECTURE.md` | Dokumentasi arah clean architecture. |
| `docs/PRODUCTION-ARCHITECTURE.md` | Catatan arsitektur production. |
| `docs/features/README.md` | Index dokumentasi fitur. |
| `docs/features/auth/README.md` | Dokumentasi fitur auth. |
| `docs/features/users-access/README.md` | Dokumentasi akses user. |
| `docs/features/admin-classes/README.md` | Dokumentasi fitur admin kelas. |
| `docs/features/class-profile/README.md` | Dokumentasi profil kelas. |
| `docs/features/students/README.md` | Dokumentasi siswa. |
| `docs/features/payments/README.md` | Dokumentasi pembayaran. |
| `docs/features/expenses/README.md` | Dokumentasi pengeluaran. |
| `docs/features/reports/README.md` | Dokumentasi laporan. |
| `docs/features/savings/README.md` | Dokumentasi tabungan. |
| `docs/features/audit-logs/README.md` | Dokumentasi audit log. |
| `docs/features/uploads/README.md` | Dokumentasi upload. |
| `docs/features/academic-year-migration/README.md` | Dokumentasi migrasi tahun ajaran. |
| `docs/features/runtime-deployment/README.md` | Dokumentasi runtime/deployment. |

## 17. Database

Datasource:

- Provider: MySQL.
- URL: `env("DATABASE_URL")`.
- Prisma Client: `prisma-client-js`.

### Enum

| Enum | Nilai | Fungsi |
| --- | --- | --- |
| `Role` | `ADMIN`, `KEPALA_SEKOLAH`, `WALI_KELAS`, `BENDAHARA` | Role user. |
| `StudentStatus` | `AKTIF`, `BEBAS_KAS`, `PINDAH` | Status siswa. |
| `ClassStatus` | `ACTIVE`, `ARCHIVED` | Status kelas aktif/arsip. |
| `MigrationJobStatus` | `PENDING`, `RUNNING`, `COMPLETED`, `FAILED` | Status job migrasi. |
| `ExpenseCategory` | `KONSUMSI`, `ALAT_KEBERSIHAN`, `KEGIATAN_KELAS`, `LAINNYA` | Kategori pengeluaran. |
| `SavingsTransactionType` | `DEPOSIT`, `WITHDRAWAL` | Jenis transaksi tabungan. |
| `WithdrawalStatus` | `MENUNGGU`, `DISETUJUI`, `DITOLAK` | Status pengajuan penarikan. |
| `AuditEventType` | `AUTH`, `KEUANGAN`, `MANAJEMEN`, `SISTEM` | Kategori audit event. |
| `AuditStatus` | `SUCCESS`, `FAILED`, `WARNING` | Status audit event. |
| `AuditSeverity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Tingkat pentingnya audit. |

### Model utama

#### `User`

Mewakili akun aplikasi.

Field penting:

- `id`, `name`, `username`, `passwordHash`, `role`.
- `classId` opsional untuk role yang terikat kelas.
- Relasi ke session, payment, expense, savings, withdrawal, audit log, notification.

Index:

- `classId, role`
- `role, createdAt`

Relasi penting:

- Banyak user bisa tergabung ke satu `Class`.
- User bisa menjadi actor pencatat/pemroses banyak data.

#### `Class`

Mewakili kelas per tahun ajaran.

Field penting:

- `name`, `tingkat`, `tahunAjaran`, `kasNominal`.
- `status`, `archivedAt`, `archiveLabel`.
- `promotedFromClassId`, `migrationJobId` untuk migrasi tahun ajaran.

Constraint:

- Unique `name, tahunAjaran`.

Relasi:

- Punya banyak `User`, `Student`, `Payment`, `Expense`, `SavingsAccount`, `SavingsTransaction`, `WithdrawalRequest`, `AuditLog`, `Notification`.

#### `Student`

Mewakili siswa di satu kelas.

Field penting:

- `classId`, `name`, `nis`, `status`, `statusReason`.
- `statusSetById`, `statusSetAt` untuk riwayat perubahan status.

Relasi:

- Satu siswa punya banyak `Payment`.
- Satu siswa punya satu `SavingsAccount`.
- Satu siswa punya banyak transaksi tabungan dan withdrawal request.

#### `Payment`

Mewakili status pembayaran kas siswa untuk bulan tertentu.

Field penting:

- `studentId`, `classId`, `year`, `month`, `isPaid`, `amount`, `paidAt`, `recordedById`.

Constraint:

- Unique `studentId, year, month`.

Catatan:

- `classId` bisa null untuk data lama, tetapi query masih fallback ke `student.classId`.
- Saat migrasi tahun ajaran ada backfill `classId`.

#### `Expense`

Mewakili pengeluaran kelas.

Field penting:

- `classId`, `category`, `itemName`, `amount`, `photoUrl`, `note`, `spentAt`, `recordedById`.

Relasi:

- Expense milik satu kelas dan dicatat oleh satu user.

#### `SavingsAccount`

Mewakili rekening tabungan siswa.

Field penting:

- `studentId` unique.
- `classId`.
- `isLocked`, `lockedAt`.

Relasi:

- Satu account punya banyak `SavingsTransaction` dan `WithdrawalRequest`.

#### `SavingsTransaction`

Mewakili transaksi tabungan.

Field penting:

- `accountId`, `studentId`, `classId`.
- `type` deposit/withdrawal.
- `amount`, `transactionDate`, `note`.
- `recordedById`, `approvedById`.
- `withdrawalRequestId` unique untuk withdrawal yang berasal dari request.
- `reversalOfId`, `isReversal` untuk dukungan koreksi transaksi.

#### `WithdrawalRequest`

Mewakili pengajuan penarikan tabungan.

Field penting:

- `accountId`, `studentId`, `classId`.
- `amount`, `reason`, `status`.
- `requestedById`, `processedById`, `processedAt`, `rejectedReason`.

Relasi:

- Bisa menghasilkan satu `SavingsTransaction` jika disetujui.

#### `AuditLog`

Mewakili log aktivitas penting.

Field penting:

- `eventType`, `eventAction`, `status`, `severity`.
- `actorId`, `actorRole`.
- `entityType`, `entityId`, `classId`.
- `ipAddress`, `userAgent`, `requestId`.
- `metadata`, `oldValue`, `newValue`.
- `previousHash`, `logHash`.

Konsep hash chain:

- Setiap log baru mengambil `logHash` terakhir sebagai `previousHash`.
- Isi log dinormalisasi dan di-hash dengan SHA-256.
- Endpoint audit dapat memverifikasi apakah rantai log masih valid.

#### `Notification`

Mewakili notifikasi user.

Field penting:

- `userId`, `classId`, `title`, `body`, `type`, `entityId`, `isRead`.

Dipakai terutama pada alur pengajuan/proses penarikan tabungan.

#### `MigrationJob`

Mewakili pekerjaan migrasi tahun ajaran.

Field penting:

- `fromTahunAjaran`, `toTahunAjaran`, `status`.
- `requestedById`, `startedAt`, `finishedAt`.
- `summary`, `errorMessage`.

#### `SystemSetting`

Key-value setting sistem.

Saat ini dipakai untuk status maintenance:

- key: `maintenance`
- value: JSON berisi `enabled`, `reason`, `jobId`, `startedAt`.

## 18. Relasi Database Ringkas

```text
Class 1 -> many User
Class 1 -> many Student
Class 1 -> many Payment
Class 1 -> many Expense
Class 1 -> many SavingsAccount
Class 1 -> many SavingsTransaction
Class 1 -> many WithdrawalRequest

User 1 -> many Session
User 1 -> many Payment recordedBy
User 1 -> many Expense recordedBy
User 1 -> many SavingsTransaction recordedBy/approvedBy
User 1 -> many WithdrawalRequest requestedBy/processedBy
User 1 -> many AuditLog actor
User 1 -> many Notification

Student 1 -> many Payment
Student 1 -> one SavingsAccount
Student 1 -> many SavingsTransaction
Student 1 -> many WithdrawalRequest

SavingsAccount 1 -> many SavingsTransaction
SavingsAccount 1 -> many WithdrawalRequest
WithdrawalRequest 1 -> optional SavingsTransaction
```

## 19. Alur Auth

1. User membuka `/login`.
2. Form memanggil `POST /api/auth/login`.
3. Route login memanggil `authenticateLogin`.
4. `authenticateLogin`:
   - cek maintenance mode,
   - validasi input dengan Zod,
   - cari user berdasarkan username,
   - verifikasi password bcrypt,
   - catat audit gagal jika credential salah.
5. Jika valid, route membuat session di tabel `Session`.
6. Cookie `spensakas_session` diset sebagai httpOnly.
7. Password hash bisa di-upgrade async jika bcrypt rounds berubah.
8. Audit login sukses dicatat.
9. User diarahkan ke dashboard sesuai role.

## 20. Alur Kas Bulanan

1. Bendahara membuka dashboard kelas.
2. UI menampilkan daftar siswa dan status pembayaran bulan tertentu.
3. Bendahara toggle pembayaran siswa.
4. Frontend memanggil `POST /api/payments/toggle`.
5. Use case `toggleStudentPayment`:
   - validasi role `BENDAHARA`,
   - validasi siswa ada dan masih `AKTIF`,
   - pastikan siswa milik kelas bendahara,
   - ambil nominal kas dari class,
   - upsert row `Payment`,
   - catat audit log.

## 21. Alur Pengeluaran

1. Bendahara membuat pengeluaran.
2. Jika ada foto, frontend meminta presigned URL ke `/api/uploads/presign`.
3. File diupload langsung ke Cloudflare R2.
4. URL publik disimpan sebagai `photoUrl` pada `Expense`.
5. `createClassExpense` mencatat pengeluaran dan audit log.
6. Pengeluaran bisa dihapus oleh bendahara kelas yang sama.

## 22. Alur Tabungan

1. Wali kelas membuka halaman tabungan.
2. Endpoint `GET /api/classes/[id]/savings` memastikan semua siswa punya `SavingsAccount`.
3. Setoran:
   - hanya wali kelas,
   - membuat `SavingsTransaction` tipe `DEPOSIT`.
4. Pengajuan penarikan:
   - wali kelas atau bendahara bisa mengajukan,
   - sistem cek saldo cukup,
   - membuat `WithdrawalRequest`.
5. Persetujuan penarikan:
   - hanya wali kelas,
   - jika disetujui, membuat `SavingsTransaction` tipe `WITHDRAWAL`,
   - update status request,
   - membuat notification,
   - mencatat audit.

## 23. Alur Migrasi Tahun Ajaran

File utama: `src/lib/services/academicYearMigration.ts`.

Konsep:

- Migrasi hanya boleh dijalankan pukul 22:00 - 05:00.
- Sistem masuk maintenance mode selama migrasi.
- Kelas tingkat 7 naik ke 8.
- Kelas tingkat 8 naik ke 9.
- Kelas tingkat 9 diarsipkan dan user classId dilepas.
- Siswa, savings account, dan user dipindah ke kelas target.
- Payment lama di-backfill `classId`.
- Semua session dihapus setelah migrasi selesai.
- Audit log `academic_year_migrated` dicatat.

## 24. Keamanan dan Audit

Yang sudah ada:

- Cookie session httpOnly.
- Cookie secure aktif saat `NODE_ENV=production`.
- Validasi input dengan Zod.
- Role guard di API/use case.
- Audit log untuk event penting.
- Audit log hash chain.
- Maintenance mode saat migrasi.
- Password bcrypt dengan configurable rounds.

Yang perlu diperhatikan sebelum production:

- Ubah semua credential seed.
- Pastikan `.env` production tidak bocor.
- Gunakan HTTPS.
- Pastikan R2 bucket policy sesuai kebutuhan.
- Batasi ukuran upload secara nyata di sisi storage atau server policy. Saat ini komentar max 5MB ada, tetapi presign route belum benar-benar memvalidasi ukuran file.
- Tambahkan rate limit login jika aplikasi dibuka publik.
- Pertimbangkan CSRF protection untuk aksi mutasi jika aplikasi digunakan lintas origin.

## 25. Catatan File Generated dan Cleanup

File/folder yang bukan source utama:

| Path | Status |
| --- | --- |
| `.next/` | Generated by Next.js. Bisa dihapus saat dev server/build tidak berjalan. |
| `node_modules/` | Generated dependency. Jangan dipelajari sebagai source. Bisa dibuat ulang dengan `npm install`. |
| `tsconfig.tsbuildinfo` | Cache incremental TypeScript. Bisa dihapus. |
| `dev-runtime.log`, `dev-runtime.err.log`, `dev-server.out.log`, `dev-server.err.log` | Log development. Bisa dihapus. |

Kandidat cleanup/refactor source:

| Path | Catatan |
| --- | --- |
| `src/components/AppLayout.tsx` | Tampak seperti wrapper lama. Pencarian internal tidak menemukan import langsung dari route saat ini. Hapus hanya setelah build/typecheck lolos. |
| `src/components/ui/FormField.tsx` | Tampak belum dipakai langsung. Hapus hanya setelah build/typecheck lolos. |
| `src/lib/utils.ts -> generateRandomToken` | Fungsi belum terlihat dipakai. Bisa dihapus jika tidak direncanakan untuk fitur token. |
| `src/lib/routes.ts -> RouteConfig` | Type belum dipakai. Bisa dihapus kecil. |
| `src/app/api/users/route.ts` dan `src/app/api/admin/users/route.ts` | Ada potensi overlap API user. Perlu diputuskan mana yang menjadi endpoint utama. |

Saya sengaja tidak menyarankan hapus source secara agresif tanpa build/typecheck, karena project belum punya test otomatis dan git status dari folder ini tidak terbaca sebagai repository aktif.

## 26. Catatan Kualitas Saat Ini

Hal yang sudah cukup baik:

- Struktur folder mulai jelas.
- Business use case mulai dipisah dari route.
- Validasi input cukup konsisten dengan Zod.
- Audit log cukup kuat untuk aplikasi sekolah.
- Role dan permission sudah terpusat sebagian.
- UI primitives cukup lengkap.

Hal yang masih kurang sebelum deployment:

- Test otomatis belum ada.
- Belum ada migration production yang jelas.
- Belum ada CI/CD.
- Beberapa route masih berisi logic bisnis langsung.
- Error handling belum seragam di semua route; sebagian memakai `errorResponse`, sebagian langsung `NextResponse`.
- Upload size limit belum benar-benar enforced.
- Default seed credential harus diganti.
- Perlu backup/restore plan database.
- Perlu dokumentasi operasional admin sekolah.

## 27. Cara Belajar Proyek Ini

Urutan belajar yang disarankan:

1. Mulai dari `prisma/schema.prisma` untuk paham data.
2. Baca `src/lib/auth.ts`, `src/middleware.ts`, dan `src/features/auth/application/loginUseCase.ts`.
3. Baca `src/lib/roles.ts` dan `src/lib/authorize.ts`.
4. Baca route sederhana seperti `src/app/api/payments/toggle/route.ts`.
5. Baca use case `src/features/payments/application/togglePaymentUseCase.ts`.
6. Baca UI yang memakai API tersebut: `src/components/domain/PaymentChecklistTable.tsx`.
7. Lanjut ke fitur siswa, pengeluaran, saldo, tabungan.
8. Terakhir baca audit log dan migrasi tahun ajaran karena lebih kompleks.

## 28. Peta Mental Sederhana

```text
Page/component
  fetch API
    route.ts
      getCurrentUser / requireClassAccess
      Zod validation
      use case atau Prisma query
      createAuditLog jika aksi penting
      JSON response
```

Jika ingin menambah fitur baru, pola yang disarankan:

1. Tambahkan model/field di Prisma jika perlu.
2. Tambahkan schema validasi di `src/lib/validations.ts`.
3. Buat use case di `src/features/<fitur>/application`.
4. Buat route API tipis di `src/app/api`.
5. Buat komponen UI di `src/components`.
6. Catat audit log untuk aksi penting.
7. Update dokumentasi fitur.

