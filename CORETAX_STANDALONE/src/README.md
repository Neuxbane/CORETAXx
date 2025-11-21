# Sistem PWD (Penyandang Wajib Pajak Daerah)

Sistem manajemen pajak daerah berbasis web yang memungkinkan pengguna mengelola aset dan pembayaran pajak mereka.

## Fitur Utama

### Autentikasi
- Login dengan email/username dan password
- Registrasi pengguna baru dengan validasi real-time
- Lupa password dengan token reset
- 2FA (Two-Factor Authentication) simulasi
- Session management menggunakan localStorage

### User Dashboard
- **Dashboard**: Ringkasan aset, pajak terutang, dan jatuh tempo
- **Data Diri**: Kelola profil dan upload foto profil
- **Data Kepemilikan**: 
  - Tambah, edit, dan hapus aset (kendaraan/properti)
  - Geolocation untuk properti
  - Transfer kepemilikan antar user
- **Manajemen Pajak**:
  - Lihat semua tagihan pajak
  - Filter berdasarkan status
  - Simulasi pembayaran pajak
- **Pengaturan**: Ganti password dan kelola akun

### Admin Dashboard
- **Dashboard Admin**: Statistik sistem dan aktivitas terkini
- **Manajemen Pengguna**: Lihat, aktifkan/nonaktifkan user
- **Manajemen Aset**: Monitor semua aset yang terdaftar
- **Transaksi Pajak**: 
  - Lihat semua transaksi pembayaran
  - Filter berdasarkan tanggal
  - Download laporan (simulasi PDF)

## Teknologi

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: localStorage (simulasi database)

## Demo Akun

### Admin
- Username: `admin`
- Password: `admin123`

### User
Anda dapat membuat akun baru melalui halaman registrasi.

## Cara Menggunakan

1. **Login/Registrasi**: Mulai dengan login atau buat akun baru
2. **Tambah Aset**: Daftarkan kendaraan atau properti Anda
3. **Lihat Pajak**: Sistem otomatis membuat tagihan pajak untuk setiap aset
4. **Bayar Pajak**: Simulasikan pembayaran pajak
5. **Transfer Kepemilikan**: Transfer aset ke user lain jika diperlukan

## Catatan Penting

⚠️ **Ini adalah prototype/demo UI**:
- Data disimpan di localStorage browser
- Tidak ada enkripsi password (password disimpan plain text)
- Email dan 2FA hanya simulasi
- Payment gateway hanya simulasi
- Laporan PDF berupa download JSON

Untuk implementasi production:
- Gunakan backend API (Node.js/PHP/Java)
- Implementasi database (PostgreSQL/MySQL)
- Enkripsi password dengan bcrypt
- Integrasi email service (SendGrid/AWS SES)
- Integrasi payment gateway (Midtrans/Xendit)
- Generate PDF dengan library (jsPDF/FPDF)
- Implementasi Row Level Security
- HTTPS dan session management yang proper
- Compliance dengan regulasi perlindungan data
