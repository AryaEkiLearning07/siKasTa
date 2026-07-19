# Auth Feature Module

Use case:

- `application/loginUseCase.ts`

Module ini memvalidasi login, maintenance mode, audit login gagal/berhasil, dan upgrade hash password. Session cookie tetap dibuat oleh adapter HTTP melalui `src/lib/auth.ts`.

Dokumentasi lengkap: `docs/features/auth/README.md`.
