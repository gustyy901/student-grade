-- ============================================
-- SISTEM REKAPITULASI NILAI SISWA
-- MySQL Database Schema
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS rekap_nilai_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rekap_nilai_db;

-- ============================================
-- TABLE: siswa
-- Stores student information
-- ============================================
CREATE TABLE IF NOT EXISTS siswa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nis VARCHAR(20) NOT NULL UNIQUE COMMENT 'Nomor Induk Siswa',
  nama VARCHAR(100) NOT NULL COMMENT 'Nama lengkap siswa',
  kelas VARCHAR(20) NOT NULL COMMENT 'Kelas siswa (contoh: 10A, 11B)',
  jenis_kelamin ENUM('Laki-laki', 'Perempuan') NOT NULL COMMENT 'Jenis kelamin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nis (nis),
  INDEX idx_nama (nama),
  INDEX idx_kelas (kelas)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: mata_pelajaran
-- Stores subject/course information
-- ============================================
CREATE TABLE IF NOT EXISTS mata_pelajaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_mapel VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nama mata pelajaran',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nama_mapel (nama_mapel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: nilai_tugas
-- Stores assignment grades (multiple allowed)
-- ============================================
CREATE TABLE IF NOT EXISTS nilai_tugas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  siswa_id INT NOT NULL COMMENT 'ID siswa',
  mapel_id INT NOT NULL COMMENT 'ID mata pelajaran',
  semester INT NOT NULL COMMENT 'Semester (1 atau 2)',
  nilai_tugas DECIMAL(5,2) NOT NULL COMMENT 'Nilai tugas (0-100)',
  keterangan TEXT COMMENT 'Keterangan tugas (opsional)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_siswa_mapel (siswa_id, mapel_id, semester),
  CHECK (nilai_tugas >= 0 AND nilai_tugas <= 100),
  CHECK (semester IN (1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: nilai_uts
-- Stores midterm exam grades (one per student per subject per semester)
-- ============================================
CREATE TABLE IF NOT EXISTS nilai_uts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  siswa_id INT NOT NULL COMMENT 'ID siswa',
  mapel_id INT NOT NULL COMMENT 'ID mata pelajaran',
  semester INT NOT NULL COMMENT 'Semester (1 atau 2)',
  nilai_uts DECIMAL(5,2) NOT NULL COMMENT 'Nilai UTS (0-100)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY unique_uts (siswa_id, mapel_id, semester) COMMENT 'Only one UTS per student per subject per semester',
  INDEX idx_siswa_mapel (siswa_id, mapel_id, semester),
  CHECK (nilai_uts >= 0 AND nilai_uts <= 100),
  CHECK (semester IN (1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: nilai_uas
-- Stores final exam grades (one per student per subject per semester)
-- ============================================
CREATE TABLE IF NOT EXISTS nilai_uas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  siswa_id INT NOT NULL COMMENT 'ID siswa',
  mapel_id INT NOT NULL COMMENT 'ID mata pelajaran',
  semester INT NOT NULL COMMENT 'Semester (1 atau 2)',
  nilai_uas DECIMAL(5,2) NOT NULL COMMENT 'Nilai UAS (0-100)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY unique_uas (siswa_id, mapel_id, semester) COMMENT 'Only one UAS per student per subject per semester',
  INDEX idx_siswa_mapel (siswa_id, mapel_id, semester),
  CHECK (nilai_uas >= 0 AND nilai_uas <= 100),
  CHECK (semester IN (1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================

-- Sample Students
INSERT INTO siswa (nis, nama, kelas, jenis_kelamin) VALUES
('2024001', 'Ahmad Fauzi', '10A', 'Laki-laki'),
('2024002', 'Siti Nurhaliza', '10A', 'Perempuan'),
('2024003', 'Budi Santoso', '10B', 'Laki-laki'),
('2024004', 'Dewi Lestari', '10B', 'Perempuan'),
('2024005', 'Rizki Prasetyo', '11A', 'Laki-laki');

-- Sample Subjects
INSERT INTO mata_pelajaran (nama_mapel) VALUES
('Matematika'),
('Bahasa Indonesia'),
('Bahasa Inggris'),
('IPA'),
('IPS'),
('Pendidikan Agama'),
('Seni Budaya'),
('Penjasorkes');

-- Sample Assignment Grades
INSERT INTO nilai_tugas (siswa_id, mapel_id, semester, nilai_tugas, keterangan) VALUES
(1, 1, 1, 85.5, 'Tugas Aljabar'),
(1, 1, 1, 90.0, 'Tugas Geometri'),
(1, 1, 1, 88.0, 'Tugas Statistika'),
(1, 2, 1, 82.0, 'Tugas Membaca'),
(2, 1, 1, 92.0, 'Tugas Aljabar'),
(2, 1, 1, 95.0, 'Tugas Geometri');

-- Sample Midterm Grades
INSERT INTO nilai_uts (siswa_id, mapel_id, semester, nilai_uts) VALUES
(1, 1, 1, 87.0),
(1, 2, 1, 85.0),
(2, 1, 1, 93.0);

-- Sample Final Grades
INSERT INTO nilai_uas (siswa_id, mapel_id, semester, nilai_uas) VALUES
(1, 1, 1, 89.0),
(1, 2, 1, 86.0),
(2, 1, 1, 94.0);

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- View: Complete grade details with student and subject info
CREATE OR REPLACE VIEW view_nilai_lengkap AS
SELECT 
  s.id AS siswa_id,
  s.nis,
  s.nama AS nama_siswa,
  s.kelas,
  s.jenis_kelamin,
  mp.id AS mapel_id,
  mp.nama_mapel,
  nt.semester,
  nt.nilai_tugas,
  nt.keterangan,
  uts.nilai_uts,
  uas.nilai_uas
FROM siswa s
CROSS JOIN mata_pelajaran mp
LEFT JOIN nilai_tugas nt ON s.id = nt.siswa_id AND mp.id = nt.mapel_id
LEFT JOIN nilai_uts uts ON s.id = uts.siswa_id AND mp.id = uts.mapel_id AND nt.semester = uts.semester
LEFT JOIN nilai_uas uas ON s.id = uas.siswa_id AND mp.id = uas.mapel_id AND nt.semester = uas.semester;

-- View: Weighted average calculation per student per subject per semester
CREATE OR REPLACE VIEW view_nilai_akhir AS
SELECT 
  s.id AS siswa_id,
  s.nis,
  s.nama AS nama_siswa,
  s.kelas,
  mp.id AS mapel_id,
  mp.nama_mapel,
  COALESCE(uts.semester, uas.semester) AS semester,
  ROUND(AVG(nt.nilai_tugas), 2) AS rata_rata_tugas,
  uts.nilai_uts,
  uas.nilai_uas,
  ROUND(
    (COALESCE(AVG(nt.nilai_tugas), 0) * 0.4) + 
    (COALESCE(uts.nilai_uts, 0) * 0.3) + 
    (COALESCE(uas.nilai_uas, 0) * 0.3),
    2
  ) AS nilai_akhir,
  CASE 
    WHEN ROUND(
      (COALESCE(AVG(nt.nilai_tugas), 0) * 0.4) + 
      (COALESCE(uts.nilai_uts, 0) * 0.3) + 
      (COALESCE(uas.nilai_uas, 0) * 0.3),
      2
    ) >= 90 THEN 'A'
    WHEN ROUND(
      (COALESCE(AVG(nt.nilai_tugas), 0) * 0.4) + 
      (COALESCE(uts.nilai_uts, 0) * 0.3) + 
      (COALESCE(uas.nilai_uas, 0) * 0.3),
      2
    ) >= 80 THEN 'B'
    WHEN ROUND(
      (COALESCE(AVG(nt.nilai_tugas), 0) * 0.4) + 
      (COALESCE(uts.nilai_uts, 0) * 0.3) + 
      (COALESCE(uas.nilai_uas, 0) * 0.3),
      2
    ) >= 70 THEN 'C'
    WHEN ROUND(
      (COALESCE(AVG(nt.nilai_tugas), 0) * 0.4) + 
      (COALESCE(uts.nilai_uts, 0) * 0.3) + 
      (COALESCE(uas.nilai_uas, 0) * 0.3),
      2
    ) >= 60 THEN 'D'
    ELSE 'E'
  END AS grade,
  CASE 
    WHEN ROUND(
      (COALESCE(AVG(nt.nilai_tugas), 0) * 0.4) + 
      (COALESCE(uts.nilai_uts, 0) * 0.3) + 
      (COALESCE(uas.nilai_uas, 0) * 0.3),
      2
    ) >= 70 THEN 'LULUS'
    ELSE 'TIDAK LULUS'
  END AS status
FROM siswa s
CROSS JOIN mata_pelajaran mp
LEFT JOIN nilai_tugas nt ON s.id = nt.siswa_id AND mp.id = nt.mapel_id
LEFT JOIN nilai_uts uts ON s.id = uts.siswa_id AND mp.id = uts.mapel_id
LEFT JOIN nilai_uas uas ON s.id = uas.siswa_id AND mp.id = uas.mapel_id AND uts.semester = uas.semester
WHERE nt.semester IS NOT NULL OR uts.semester IS NOT NULL OR uas.semester IS NOT NULL
GROUP BY s.id, s.nis, s.nama, s.kelas, mp.id, mp.nama_mapel, uts.semester, uts.nilai_uts, uas.nilai_uas;

-- ============================================
-- STORED PROCEDURES (OPTIONAL)
-- ============================================

-- Procedure: Get student report card for specific semester
DELIMITER //
CREATE PROCEDURE get_rapor_siswa(
  IN p_siswa_id INT,
  IN p_semester INT
)
BEGIN
  SELECT 
    s.nis,
    s.nama AS nama_siswa,
    s.kelas,
    s.jenis_kelamin,
    mp.nama_mapel,
    ROUND(AVG(nt.nilai_tugas), 2) AS rata_rata_tugas,
    uts.nilai_uts,
    uas.nilai_uas,
    ROUND(
      (COALESCE(AVG(nt.nilai_tugas), 0) * 0.4) + 
      (COALESCE(uts.nilai_uts, 0) * 0.3) + 
      (COALESCE(uas.nilai_uas, 0) * 0.3),
      2
    ) AS nilai_akhir
  FROM siswa s
  CROSS JOIN mata_pelajaran mp
  LEFT JOIN nilai_tugas nt ON s.id = nt.siswa_id AND mp.id = nt.mapel_id AND nt.semester = p_semester
  LEFT JOIN nilai_uts uts ON s.id = uts.siswa_id AND mp.id = uts.mapel_id AND uts.semester = p_semester
  LEFT JOIN nilai_uas uas ON s.id = uas.siswa_id AND mp.id = uas.mapel_id AND uas.semester = p_semester
  WHERE s.id = p_siswa_id
  GROUP BY s.nis, s.nama, s.kelas, s.jenis_kelamin, mp.nama_mapel, uts.nilai_uts, uas.nilai_uas
  HAVING rata_rata_tugas IS NOT NULL OR uts.nilai_uts IS NOT NULL OR uas.nilai_uas IS NOT NULL;
END //
DELIMITER ;

-- ============================================
-- DATABASE SETUP COMPLETE
-- ============================================

-- Show all tables
SHOW TABLES;

-- Show table structures
DESCRIBE siswa;
DESCRIBE mata_pelajaran;
DESCRIBE nilai_tugas;
DESCRIBE nilai_uts;
DESCRIBE nilai_uas;
