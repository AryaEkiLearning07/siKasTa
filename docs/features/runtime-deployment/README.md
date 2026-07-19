# Runtime and Deployment

## Purpose

Dokumen ini menjelaskan cara menjalankan aplikasi untuk development, demo publik, dan deployment PC lain.

## Development Runtime

Untuk coding dan testing lokal:

```powershell
cd E:\KAS-INTEGRASI
npm run db:generate
npm run dev
```

Buka:

```text
http://localhost:3000
```

Jangan gunakan `npm run build` sebagai langkah harian. Build hanya untuk production/demo publik stabil.

## Production-like Runtime

Gunakan hanya saat ingin menjalankan output production:

```powershell
npm run build
npm run start
```

## Required Services

- Node.js LTS
- MySQL/MariaDB, misalnya dari XAMPP
- Database sesuai `DATABASE_URL`

## Required Environment

Minimal:

```env
DATABASE_URL="mysql://root@localhost:3306/spensakas"
PASSWORD_HASH_ROUNDS=10
```

Opsional untuk upload:

```env
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

## Moving To Another PC

1. Install Node.js LTS.
2. Install XAMPP/MySQL.
3. Copy project.
4. Copy or recreate `.env`.
5. Create/import database.
6. Run `npm install`.
7. Run `npm run db:generate`.
8. Run `npm run db:push` only for a fresh database.
9. Run `npm run dev` for development.

## Extension Checklist

- Add process manager for real production.
- Add database backup and restore SOP.
- Keep Cloudflare Tunnel guide in `PANDUAN-PUBLIC-DOMAIN-CLOUDFLARE-TUNNEL.md`.
