# Setup Instructions - Sistem Rekapitulasi Nilai Siswa

## 🎯 Arsitektur Aplikasi

Aplikasi ini terdiri dari 2 bagian:
1. **Frontend** (React + Vite) - berjalan di Lovable
2. **Backend** (Node.js Express + MySQL) - berjalan di komputer Anda

## 📦 Yang Sudah Tersedia

✅ Database schema MySQL lengkap di `database/rekap_nilai_schema.sql`  
✅ Backend Node.js Express lengkap di folder `backend/`  
✅ Frontend React sudah terintegrasi dengan backend API  
✅ Semua fitur CRUD lengkap untuk Siswa, Mata Pelajaran, dan Nilai

## 🚀 Cara Menjalankan Aplikasi

### 1. Setup Backend (Node.js + MySQL)

#### A. Install Node.js dan MySQL
- Download dan install [Node.js](https://nodejs.org/) (v14 atau lebih tinggi)
- Install MySQL Server (atau gunakan XAMPP/WAMP)

#### B. Setup Backend
```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# Buat file .env dari template
cp .env.example .env

# Edit file .env dengan kredensial MySQL Anda
# Buka .env dan sesuaikan:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=password_mysql_anda
# DB_NAME=rekap_nilai_db
```

#### C. Jalankan Backend
```bash
# Jalankan server
npm start

# Atau untuk development dengan auto-reload
npm run dev
```

**✨ Magic happens here:**
- Backend akan otomatis membuat database `rekap_nilai_db`
- Semua tabel akan dibuat otomatis (siswa, mata_pelajaran, nilai_tugas, nilai_uts, nilai_uas)
- Foreign keys dan indexes sudah dikonfigurasi
- Server berjalan di `http://localhost:3001`

### 2. Setup Frontend (React)

Frontend sudah berjalan di Lovable, tapi perlu tahu alamat backend:

#### A. Setting API URL
Buat file `.env.local` di root project dengan isi:
```
VITE_API_URL=http://localhost:3001/api
```

#### B. Frontend akan otomatis terhubung ke backend

## 🎨 Fitur yang Tersedia

### ✅ Data Siswa
- Tambah, Edit, Hapus siswa
- Field: NIS, Nama, Kelas, Jenis Kelamin
- **Catatan:** Field alamat sudah dihapus sesuai permintaan

### ✅ Mata Pelajaran
- Tambah, Edit, Hapus mata pelajaran
- Contoh: Matematika, Bahasa Inggris, IPA, dll

### ✅ Input Nilai
- Pilih Siswa, Mata Pelajaran, Semester
- **Nilai Tugas:** Bisa banyak per mapel/semester
- **Nilai UTS:** Maksimal 1 per mapel/semester
- **Nilai UAS:** Maksimal 1 per mapel/semester
- Validasi duplikat otomatis

### ✅ Detail Nilai
- Lihat nilai lengkap per siswa
- Filter by Siswa, Mapel, Semester
- Hitung Weighted Average otomatis:
  - Tugas: 40%
  - UTS: 30%
  - UAS: 30%
- Tampilkan grade (A, B, C, D, E)

### ✅ Dashboard
- Statistik total siswa
- Rata-rata nilai tugas, UTS, UAS
- Charts dan visualisasi

### ✅ Laporan
- Export ke PDF
- Export ke Excel

## 🔧 Troubleshooting

### Backend tidak bisa connect ke MySQL
```bash
# Pastikan MySQL server berjalan
# Di Windows (XAMPP): Start MySQL di Control Panel
# Di Linux: sudo service mysql start
```

### Port 3001 sudah digunakan
Edit file `backend/.env`:
```
PORT=3002
```
Dan update `.env.local` di frontend:
```
VITE_API_URL=http://localhost:3002/api
```

### Database tidak terbuat otomatis
Import manual:
```bash
mysql -u root -p < database/rekap_nilai_schema.sql
```

## 📊 Database Schema

### Table: siswa
- id (PK)
- nis
- nama
- kelas
- jenis_kelamin (ENUM: 'L', 'P')

### Table: mata_pelajaran
- id (PK)
- nama_mapel

### Table: nilai_tugas
- id (PK)
- siswa_id (FK)
- mapel_id (FK)
- semester
- nilai
- keterangan

### Table: nilai_uts
- id (PK)
- siswa_id (FK)
- mapel_id (FK)
- semester
- nilai
- UNIQUE(siswa_id, mapel_id, semester)

### Table: nilai_uas
- id (PK)
- siswa_id (FK)
- mapel_id (FK)
- semester
- nilai
- UNIQUE(siswa_id, mapel_id, semester)

## 🌐 API Endpoints

Dokumentasi lengkap ada di `backend/README.md`

Base URL: `http://localhost:3001/api`

**Students:** `/siswa`  
**Subjects:** `/mapel`  
**Grades:** `/nilai/tugas`, `/nilai/uts`, `/nilai/uas`  
**Dashboard:** `/dashboard/stats`

## 💡 Tips

1. **Jalankan backend dulu** sebelum menggunakan frontend
2. **Cek console browser** jika ada error koneksi API
3. **Gunakan MySQL Workbench** untuk melihat data di database
4. **Backup database** secara berkala

## 🎯 Next Steps

1. Jalankan backend di `http://localhost:3001`
2. Buka frontend di Lovable
3. Mulai input data siswa
4. Tambah mata pelajaran
5. Input nilai
6. Lihat dashboard dan laporan

## 📞 Support

Jika ada masalah, cek:
- Console browser (F12)
- Terminal backend (lihat error logs)
- MySQL connection
- File .env sudah benar

Good luck! 🚀
