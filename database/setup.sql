-- =====================================================
-- SCRIPT SETUP DATABASE REKAP NILAI SISWA
-- Jalankan script ini di MySQL untuk membuat database
-- =====================================================

-- Buat database
CREATE DATABASE IF NOT EXISTS rekap_nilai_db;
USE rekap_nilai_db;

-- =====================================================
-- TABEL SISWA (Students)
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nis VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(255) NOT NULL,
    kelas VARCHAR(50) NOT NULL,
    jenis_kelamin ENUM('L', 'P') NOT NULL,
    alamat TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABEL MATA PELAJARAN (Subjects)
-- =====================================================
CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nama_mapel VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABEL NILAI TUGAS (Assignments)
-- =====================================================
CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    student_id VARCHAR(36) NOT NULL,
    mapel_id VARCHAR(36) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    nilai DECIMAL(5,2) NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE
);

-- =====================================================
-- TABEL NILAI UTS (Midterms)
-- =====================================================
CREATE TABLE IF NOT EXISTS midterms (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    student_id VARCHAR(36) NOT NULL,
    mapel_id VARCHAR(36) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    nilai DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
    UNIQUE KEY unique_uts (student_id, mapel_id, semester)
);

-- =====================================================
-- TABEL NILAI UAS (Finals)
-- =====================================================
CREATE TABLE IF NOT EXISTS finals (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    student_id VARCHAR(36) NOT NULL,
    mapel_id VARCHAR(36) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    nilai DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
    UNIQUE KEY unique_uas (student_id, mapel_id, semester)
);

-- =====================================================
-- INDEX UNTUK PERFORMA
-- =====================================================
CREATE INDEX idx_students_kelas ON students(kelas);
CREATE INDEX idx_students_nis ON students(nis);
CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_mapel ON assignments(mapel_id);
CREATE INDEX idx_assignments_semester ON assignments(semester);
CREATE INDEX idx_midterms_student ON midterms(student_id);
CREATE INDEX idx_midterms_mapel ON midterms(mapel_id);
CREATE INDEX idx_finals_student ON finals(student_id);
CREATE INDEX idx_finals_mapel ON finals(mapel_id);

-- =====================================================
-- DATA CONTOH (OPSIONAL - hapus jika tidak diperlukan)
-- =====================================================

-- Contoh mata pelajaran
INSERT INTO mata_pelajaran (id, nama_mapel) VALUES
(UUID(), 'Matematika'),
(UUID(), 'Bahasa Indonesia'),
(UUID(), 'Bahasa Inggris'),
(UUID(), 'IPA'),
(UUID(), 'IPS');

-- =====================================================
-- SELESAI! Database siap digunakan
-- =====================================================
SELECT 'Database rekap_nilai_db berhasil dibuat!' AS status;
