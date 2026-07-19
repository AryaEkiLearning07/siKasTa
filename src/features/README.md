x# Feature Modules

Folder ini berisi use case yang sudah mulai dipisahkan dari Next.js route handlers.

Boundary:

- `application/` berisi workflow bisnis dan transaksi.
- Route di `src/app/api` hanya adapter HTTP.
- Use case boleh memakai `src/lib` untuk infrastruktur saat ini.
- Use case tidak boleh mengimpor `NextRequest`, `NextResponse`, atau komponen UI.

Dokumentasi maintenance lengkap ada di `docs/features`.
