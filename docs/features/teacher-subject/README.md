# Teacher Subject, Attendance, and Grades

## Purpose

Fitur ini mengatur akun guru mata pelajaran, assignment mengajar per kelas/mapel, absensi harian per pertemuan, input nilai, dan export Excel siap cetak.

## Main entry points

- UI daftar kelas diajar: `src/app/guru-mapel/page.tsx`
- UI detail kelas/mapel: `src/app/guru-mapel/[assignmentId]/page.tsx`
- Layout protected guru mapel: `src/app/guru-mapel/layout.tsx`
- API daftar assignment: `src/app/api/guru-mapel/classes/route.ts`
- API detail assignment: `src/app/api/guru-mapel/assignments/[assignmentId]/route.ts`
- API absensi: `src/app/api/guru-mapel/assignments/[assignmentId]/attendance/route.ts`
- Export absensi: `src/app/api/guru-mapel/assignments/[assignmentId]/attendance/export/route.ts`
- API nilai: `src/app/api/guru-mapel/assignments/[assignmentId]/grades/route.ts`
- Export nilai: `src/app/api/guru-mapel/assignments/[assignmentId]/grades/export/route.ts`
- Admin akun guru: `src/components/admin/AdminConsole.tsx`
- Modal assignment guru: `src/components/admin/UserComponents.tsx`

## Data model ownership

- `Subject`: master mata pelajaran.
- `TeachingAssignment`: relasi guru, kelas, mapel, dan tahun ajaran.
- `HomeroomAssignment`: relasi guru sebagai wali kelas.
- `AttendanceSession`: sesi absensi per assignment, tanggal, dan pertemuan.
- `AttendanceRecord`: status absensi siswa dengan kode `H`, `I`, `S`, `A`.
- `Assessment`: satu kegiatan penilaian.
- `GradeRecord`: nilai per siswa pada satu assessment.

## Business rules

- Satu akun guru dapat menjadi guru mapel saja atau guru mapel sekaligus wali kelas.
- Menu `Guru Mata Pelajaran` muncul jika user punya `TeachingAssignment` aktif.
- Menu `Wali Kelas` tetap memakai role/class scope lama dan didukung `HomeroomAssignment`.
- Absensi dibuat per tanggal dan nomor pertemuan.
- Absensi tanggal hari ini bisa diedit oleh guru pemilik assignment.
- Absensi tanggal sebelumnya hanya bisa dilihat.
- Export absensi memakai kode `H = Hadir`, `I = Izin`, `S = Sakit`, `A = Alpa`.

## Audit and security notes

- Semua API guru mapel memvalidasi assignment aktif milik user login.
- Simpan absensi dan nilai mencatat audit log.
- Hapus akun guru melalui admin menonaktifkan assignment mengajar dan wali kelas.
- Export hanya tersedia untuk guru pemilik assignment.

## Extension checklist

- Jika format Excel harus 100% mengikuti template sekolah, gunakan file template `.xlsx` resmi dan isi workbook dari template tersebut.
- Lengkapi data siswa `nisn` dan `gender` agar kolom NISN, L/P, serta jumlah laki-laki/perempuan terisi sempurna.
- Jika koreksi absensi lampau dibutuhkan, buat flow khusus admin/wali kelas dengan audit log.
