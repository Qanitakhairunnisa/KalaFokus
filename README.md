# KalaFokus — Cognitive Productivity & Anti-Burnout SPA

**KalaFokus** adalah aplikasi produktivitas *Single Page Application (SPA)* berbasis psikologi kognitif (*Cognitive Load Theory*, *Attention Restoration Theory*, dan *Dopamine Homeostasis*) yang dirancang untuk mengelola rentang fokus, menampung pemikiran impulsif secara paralel, memantau batas aman tontonan video pendek (*BrainFall*), dan mencegah *burnout* melalui evaluasi psikologis humanis bertenaga **Google Gemini API**.

---

## Struktur Direktori Proyek

```text
kalafokus/
├── index.html                      # Antarmuka Utama SPA (Auth Gate + 6 Halaman + Drawer Parkir Ide)
├── manifest.json                   # Konfigurasi Progressive Web App (Add to Home Screen)
├── sw.js                           # Service Worker untuk Offline Caching & Instalasi PWA
├── assets/
│   ├── css/
│   │   └── custom.css              # Gaya Editorial (Lora & Plus Jakarta Sans) & Zen Mode
│   ├── js/
│   │   └── app.js                  # Logika Routing SPA, Dual-Mode DB, Timer, BrainFall & Gemini AI
│   └── icons/
│       ├── icon-192.svg            # Ikon Aplikasi PWA 192x192
│       └── icon-512.svg            # Ikon Aplikasi PWA 512x512
├── api/
│   ├── config.php                  # Koneksi PDO MySQL, CORS, & Konfigurasi Bcrypt Cost 12
│   ├── auth.php                    # Endpoint Autentikasi (password_hash & password_verify Bcrypt)
│   └── index.php                   # RESTful API Endpoint untuk 6 Tabel Relasional
└── database/
    └── kalafokus_schema.sql        # Skema DDL MySQL 6 Tabel Relasional + Data Awal (Seeder)
```

---

## Cara Menjalankan Aplikasi

### 1. Mode Mandiri Instan (Tanpa Setup Server)
Buka berkas `index.html` secara langsung di browser modern atau jalankan server statis lokal:
```powershell
cd C:\Users\fika\kalafokus
npx serve .
```
Aplikasi otomatis menggunakan **Dual-Mode Relational Store** berbasis `LocalStorage` yang mereplikasi ke-6 tabel MySQL lengkap dengan data simulasi awal.
- **Email Akun Demo**: `nadia@kalafokus.id`
- **Kata Sandi**: `kalafokus2026`

### 2. Mode Full-Stack PHP 8+ & MySQL
1. Impor berkas `database/kalafokus_schema.sql` ke MySQL / MariaDB Anda (`kalafokus_db`).
2. Sesuaikan kredensial database pada `api/config.php` bila diperlukan.
3. Jalankan server bawaan PHP dari direktori `C:\Users\fika\kalafokus`:
   ```powershell
   php -S localhost:8080
   ```
4. Buka `http://localhost:8080` di browser. Indikator pada sidebar akan otomatis berubah menjadi **`PHP + MySQL Live`**.
5. Untuk mengaktifkan **Gemini API** secara langsung, buka menu **Evaluasi AI Gemini** dan masukkan Google AI Studio API Key (`AIza...`), atau gunakan mesin sintesis psikologi kognitif bawaan yang langsung berfungsi tanpa kunci eksternal.
