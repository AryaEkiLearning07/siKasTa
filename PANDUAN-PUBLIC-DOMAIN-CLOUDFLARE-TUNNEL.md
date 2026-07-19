# Panduan Membuat Web Bisa Diakses Publik Dengan Domain dan Cloudflare Tunnel

Panduan ini dibuat untuk kondisi saat ini:

- Aplikasi masih berjalan dari laptop sendiri.
- Domain sudah dibeli: `sikasta.my.id`.
- Akun Cloudflare sudah ada.
- Aplikasi menggunakan Next.js, Prisma, dan MySQL.
- Tujuan: aplikasi bisa dibuka dari internet melalui `https://sikasta.my.id`.

Skema akhirnya:

```txt
Laptop menjalankan aplikasi Next.js
        |
cloudflared membuat tunnel aman
        |
Cloudflare
        |
https://sikasta.my.id
```

Dengan Cloudflare Tunnel, laptop tidak perlu punya IP public, tidak perlu port forwarding router, dan tidak perlu membuka port laptop langsung ke internet.

## 1. Pahami Istilah Dasar

### Domain

Domain adalah nama alamat website.

Contoh:

```txt
sikasta.my.id
```

### DNS

DNS adalah sistem yang memberi tahu internet bahwa sebuah domain harus diarahkan ke layanan tertentu.

Contoh sederhananya:

```txt
sikasta.my.id harus diarahkan ke Cloudflare
```

### IP Public

IP public adalah alamat jaringan/server di internet.

Biasanya kalau memakai VPS, kamu akan mendapatkan IP public seperti:

```txt
103.xxx.xxx.xxx
```

Kalau memakai laptop rumahan, sering kali laptop tidak punya IP public langsung. Laptop hanya punya IP lokal seperti:

```txt
192.168.1.10
```

IP lokal hanya bisa diakses dari jaringan WiFi yang sama. Orang dari luar internet tidak bisa langsung membuka IP lokal tersebut.

### SSL / HTTPS

SSL atau TLS adalah sistem enkripsi agar website bisa dibuka dengan aman menggunakan:

```txt
https://
```

Dengan Cloudflare Tunnel, HTTPS publik akan diurus oleh Cloudflare.

## 2. Target Akhir

Setelah semua selesai:

- Aplikasi lokal tetap berjalan di:

```txt
http://localhost:3000
```

- Pengguna luar bisa membuka:

```txt
https://sikasta.my.id
```

- Cloudflare meneruskan akses publik ke laptop melalui tunnel.

## 3. Siapkan Aplikasi Di Laptop

Buka PowerShell di folder project:

```powershell
cd E:\KAS-INTEGRASI
```

Install dependency jika belum:

```powershell
npm install
```

Generate Prisma client:

```powershell
npm run db:generate
```

Pastikan file `.env` sudah benar. Minimal harus ada `DATABASE_URL`.

Contoh format MySQL:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/NAMA_DATABASE"
```

Jika database belum dibuat atau belum sinkron:

```powershell
npm run db:push
```

Jika project memiliki seed data:

```powershell
npm run db:seed
```

Jalankan aplikasi lokal untuk production/demo publik:

```powershell
npm run build
npm run start
```

Buka browser:

```txt
http://localhost:3000
```

Jika hanya sedang coding lokal dan tidak dibuka lewat domain publik, boleh pakai:

```powershell
npm run dev
```

Namun untuk akses lewat Cloudflare Tunnel, gunakan `npm run build` lalu `npm run start` agar Next.js tidak compile halaman saat user membuka website.

Biasanya aplikasi berjalan di:

```txt
http://localhost:3000
```

## 4. Masukkan Domain Ke Cloudflare

Buka:

```txt
https://dash.cloudflare.com
```

Langkahnya:

1. Klik **Add a domain** atau **Add site**.
2. Masukkan domain:

```txt
sikasta.my.id
```

3. Pilih plan **Free**.
4. Cloudflare akan melakukan scan DNS.
5. Lanjut sampai Cloudflare memberi 2 nameserver.

Contoh nameserver:

```txt
ada.ns.cloudflare.com
mark.ns.cloudflare.com
```

Nameserver milikmu bisa berbeda. Gunakan nameserver yang muncul di akun Cloudflare kamu.

## 5. Ganti Nameserver Di IDwebhouse / IDwebhost

Masuk ke panel tempat membeli domain.

Cari menu seperti:

```txt
Domain Management
Nameserver
Kelola Nameserver
Custom Nameserver
```

Ganti nameserver lama dengan 2 nameserver dari Cloudflare.

Contoh:

```txt
Nameserver 1: ada.ns.cloudflare.com
Nameserver 2: mark.ns.cloudflare.com
```

Simpan perubahan.

Setelah itu kembali ke Cloudflare dan klik:

```txt
Check nameservers
```

Tunggu proses propagasi. Biasanya bisa beberapa menit, tetapi kadang sampai 24 jam.

Untuk mengecek nameserver, buka:

```txt
https://www.whatsmydns.net/#NS/sikasta.my.id
```

Jika sudah muncul nameserver Cloudflare, berarti domain sudah diarahkan ke Cloudflare.

## 6. Buat Cloudflare Zero Trust

Cloudflare Tunnel berada di area **Zero Trust**.

Di dashboard Cloudflare:

1. Cari menu **Zero Trust**.
2. Jika pertama kali masuk, Cloudflare mungkin meminta kamu membuat nama tim.
3. Isi bebas, misalnya:

```txt
sikasta
```

4. Pilih plan **Free** jika diminta.

Dashboard Zero Trust biasanya berada di:

```txt
https://one.dash.cloudflare.com
```

## 7. Buat Tunnel

Di dashboard Zero Trust:

1. Masuk ke menu:

```txt
Networks
```

2. Pilih:

```txt
Tunnels
```

3. Klik:

```txt
Create a tunnel
```

4. Pilih connector:

```txt
Cloudflared
```

5. Beri nama tunnel:

```txt
sikasta-laptop
```

6. Klik **Save tunnel** atau lanjut.

Cloudflare akan menampilkan instruksi instalasi untuk Windows.

## 8. Install cloudflared Di Windows

Di halaman tunnel Cloudflare, pilih environment:

```txt
Windows
```

Cloudflare akan menampilkan perintah seperti:

```powershell
cloudflared.exe service install TOKEN_PANJANG_DARI_CLOUDFLARE
```

Jalankan perintah yang muncul di dashboard Cloudflare. Token setiap akun berbeda, jadi jangan menyalin contoh dari orang lain.

Jika `cloudflared` belum dikenali di PowerShell, download installer dari:

```txt
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
```

Setelah install berhasil, status tunnel di Cloudflare harus menjadi:

```txt
Healthy
```

atau connector terlihat aktif.

## 9. Hubungkan Domain Ke Laptop

Masih di pengaturan tunnel:

1. Masuk ke tab:

```txt
Public Hostname
```

2. Klik:

```txt
Add a public hostname
```

Isi seperti ini:

```txt
Subdomain: kosongkan
Domain: sikasta.my.id
Path: kosongkan
Type: HTTP
URL: localhost:3000
```

Penting: gunakan HTTP untuk alamat lokal:

```txt
http://localhost:3000
```

Jangan isi:

```txt
https://localhost:3000
```

Jika ingin `www.sikasta.my.id` juga bisa dibuka, tambahkan public hostname kedua:

```txt
Subdomain: www
Domain: sikasta.my.id
Path: kosongkan
Type: HTTP
URL: localhost:3000
```

## 10. Jalankan Website Di Laptop

Buka PowerShell:

```powershell
cd E:\KAS-INTEGRASI
```

Untuk domain publik/demo, jalankan mode production:

```powershell
npm run build
npm run start
```

Untuk development lokal saja:

```powershell
npm run dev
```

Cek lokal:

```txt
http://localhost:3000
```

Lalu coba buka domain:

```txt
https://sikasta.my.id
```

Jika halaman aplikasi muncul, berarti website sudah bisa diakses publik melalui domain.

## 11. Pengaturan SSL Cloudflare

Karena memakai Cloudflare Tunnel, HTTPS publik diurus Cloudflare.

Di dashboard Cloudflare untuk domain `sikasta.my.id`:

1. Masuk ke:

```txt
SSL/TLS
```

2. Pastikan SSL aktif.
3. Aktifkan:

```txt
Always Use HTTPS
```

Untuk tunnel development, kamu tidak perlu memasang sertifikat SSL manual di laptop.

Pengunjung tetap membuka:

```txt
https://sikasta.my.id
```

Cloudflare meneruskan traffic ke laptop melalui tunnel.

## 12. Jangan Expose Database

Yang boleh dipublikasikan lewat tunnel hanya aplikasi web:

```txt
localhost:3000
```

Jangan membuat public hostname untuk database:

```txt
localhost:3306
```

Database MySQL cukup lokal di laptop. Aplikasi Next.js yang mengakses database melalui `.env`.

## 13. Cek Jika Terjadi Error

### Domain belum bisa dibuka

Cek apakah aplikasi lokal hidup:

```txt
http://localhost:3000
```

Jika lokal mati, domain pasti mati.

### Tunnel tidak jalan

Cek di:

```txt
Zero Trust -> Networks -> Tunnels
```

Pastikan status tunnel:

```txt
Healthy
```

### Public hostname salah

Pastikan public hostname berisi:

```txt
sikasta.my.id -> http://localhost:3000
```

### Nameserver belum pindah

Cek:

```txt
https://www.whatsmydns.net/#NS/sikasta.my.id
```

Pastikan nameserver sudah milik Cloudflare.

### Laptop sleep atau mati

Jika laptop mati, sleep, restart, atau internet putus, website juga tidak bisa diakses.

## 14. Supaya Laptop Stabil Saat Demo

Di Windows:

1. Buka **Settings**.
2. Masuk ke **System**.
3. Pilih **Power & battery**.
4. Atur sleep menjadi:

```txt
Never
```

Minimal lakukan ini saat laptop sedang menjadi server.

Pastikan terminal yang menjalankan aplikasi tidak ditutup:

```powershell
npm run start
```

Jika masih coding dan tidak dipakai publik, boleh memakai:

```powershell
npm run dev
```

## 15. Catatan Keamanan

Karena ini aplikasi keuangan kelas, lakukan minimal hal berikut:

- Jangan pakai password admin yang mudah ditebak.
- Jangan bagikan akun admin sembarangan.
- Jangan upload file `.env` ke GitHub.
- Jangan expose database MySQL ke internet.
- Jangan isi data sangat sensitif saat masih tahap development publik.
- Jangan membuat public hostname untuk port selain aplikasi web.
- Jika hanya untuk tim kecil, pertimbangkan memakai Cloudflare Access agar sebelum membuka web pengguna harus login email tertentu.

## 16. Sinkronisasi Waktu Server

Untuk audit log dan kontrol ISO/IEC 27001:2022 klausul 8.17, jam server harus sinkron lewat NTP. Di Windows, pastikan layanan **Windows Time** aktif dan sumber waktu memakai NTP.

Cek status waktu:

```powershell
w32tm /query /status
```

Sinkronkan ulang jika diperlukan:

```powershell
w32tm /resync
```

Jika laptop/server memakai Windows, pastikan service berikut berjalan otomatis:

```powershell
Get-Service W32Time
```

Semua timestamp audit disimpan backend sebagai UTC ISO 8601 untuk presisi forensik. UI boleh menampilkan tooltip waktu lokal Asia/Jakarta/WIB untuk membantu guru dan staf membaca waktu kejadian, tetapi nilai UTC tetap menjadi sumber utama audit.

## 17. Ringkasan Super Pendek

Urutannya:

```txt
1. Aplikasi jalan di http://localhost:3000
2. Domain sikasta.my.id dimasukkan ke Cloudflare
3. Nameserver di IDwebhouse diganti ke nameserver Cloudflare
4. Cloudflare Zero Trust dibuat
5. Tunnel dibuat
6. cloudflared diinstall di laptop
7. Public hostname dibuat:
   sikasta.my.id -> http://localhost:3000
8. Buka https://sikasta.my.id
```

## 18. Referensi Resmi

- Cloudflare DNS nameserver setup:
  https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/

- Cloudflare Tunnel dashboard setup:
  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/

- Cloudflare Tunnel downloads:
  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
