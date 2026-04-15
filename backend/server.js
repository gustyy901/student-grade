const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DB_NAME = process.env.DB_NAME || 'student_grade_hub';
const JWT_SECRET = process.env.JWT_SECRET || 'student_grade_hub_secret_key_2024';

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function buildUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'teacher',
  };
}

// JWT Auth Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Akses admin diperlukan' });
  }
  next();
}

async function ensureColumnExists(conn, tableName, columnName, definition) {
  const [rows] = await conn.query(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [DB_NAME, tableName, columnName]
  );

  if (rows.length === 0) {
    await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  }
}

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.end();

    const conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'teacher') NOT NULL DEFAULT 'teacher',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ensureColumnExists(
      conn,
      'users',
      'role',
      "role ENUM('admin', 'teacher') NOT NULL DEFAULT 'teacher' AFTER password"
    );

    // Students table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        nis VARCHAR(50) NOT NULL,
        nama VARCHAR(255) NOT NULL,
        kelas VARCHAR(50) NOT NULL,
        jenis_kelamin ENUM('L', 'P') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_nis_per_user (user_id, nis)
      )
    `);

    // Mata Pelajaran table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS mata_pelajaran (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        nama_mapel VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Assignments (Tugas)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE
      )
    `);

    // Midterms (UTS)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS midterms (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        UNIQUE KEY unique_uts (student_id, mapel_id, semester)
      )
    `);

    // Finals (UAS)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS finals (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        UNIQUE KEY unique_uas (student_id, mapel_id, semester)
      )
    `);

    conn.release();
    console.log('✅ Database student_grade_hub initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

async function getTeacherCount() {
  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'");
  return rows[0].count;
}

async function getAllGradesForAdmin() {
  const [rows] = await pool.query(`
    SELECT
      combined.id,
      combined.user_id,
      combined.student_id,
      combined.mapel_id,
      combined.semester,
      combined.nilai,
      combined.grade_type,
      combined.created_at,
      s.nama AS student_name,
      mp.nama_mapel AS subject_name,
      u.name AS teacher_name
    FROM (
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'Tugas' AS grade_type
      FROM assignments
      UNION ALL
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'UTS' AS grade_type
      FROM midterms
      UNION ALL
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'UAS' AS grade_type
      FROM finals
    ) AS combined
    LEFT JOIN students s ON combined.student_id = s.id
    LEFT JOIN mata_pelajaran mp ON combined.mapel_id = mp.id
    LEFT JOIN users u ON combined.user_id = u.id
    ORDER BY combined.created_at DESC
  `);

  return rows;
}

// ============ AUTH ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar' });

    const [adminCountRows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    const role = adminCountRows[0].count === 0 ? 'admin' : 'teacher';
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name || null, email, hashedPassword, role]
    );

    res.status(201).json({ message: 'Registrasi berhasil', role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email atau password salah' });

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Email atau password salah' });

    const payload = buildUserPayload(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STUDENTS (user-scoped) ============

app.get('/api/siswa', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students WHERE user_id = ? ORDER BY nama', [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/siswa', authMiddleware, async (req, res) => {
  try {
    const { nis, nama, kelas, jenis_kelamin } = req.body;
    if (!nis || !nama || !kelas || !jenis_kelamin) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO students (id, user_id, nis, nama, kelas, jenis_kelamin) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, nis, nama, kelas, jenis_kelamin]
    );
    res.status(201).json({ id, user_id: req.user.id, nis, nama, kelas, jenis_kelamin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/siswa/:id', authMiddleware, async (req, res) => {
  try {
    const { nis, nama, kelas, jenis_kelamin } = req.body;
    await pool.query(
      'UPDATE students SET nis = ?, nama = ?, kelas = ?, jenis_kelamin = ? WHERE id = ? AND user_id = ?',
      [nis, nama, kelas, jenis_kelamin, req.params.id, req.user.id]
    );
    res.json({ id: req.params.id, nis, nama, kelas, jenis_kelamin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/siswa/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MATA PELAJARAN (user-scoped) ============

app.get('/api/mapel', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mata_pelajaran WHERE user_id = ? ORDER BY nama_mapel', [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mapel', authMiddleware, async (req, res) => {
  try {
    const { nama_mapel } = req.body;
    if (!nama_mapel) return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi' });
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO mata_pelajaran (id, user_id, nama_mapel) VALUES (?, ?, ?)',
      [id, req.user.id, nama_mapel]
    );
    res.status(201).json({ id, user_id: req.user.id, nama_mapel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/mapel/:id', authMiddleware, async (req, res) => {
  try {
    const { nama_mapel } = req.body;
    await pool.query(
      'UPDATE mata_pelajaran SET nama_mapel = ? WHERE id = ? AND user_id = ?',
      [nama_mapel, req.params.id, req.user.id]
    );
    res.json({ id: req.params.id, nama_mapel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mapel/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM mata_pelajaran WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ NILAI ROUTES ============

async function getUserGradeRows(tableName, userId, gradeType) {
  const [rows] = await pool.query(
    `
      SELECT
        g.*,
        s.nama AS student_name,
        mp.nama_mapel AS subject_name,
        ? AS grade_type
      FROM ${tableName} g
      LEFT JOIN students s ON g.student_id = s.id
      LEFT JOIN mata_pelajaran mp ON g.mapel_id = mp.id
      WHERE g.user_id = ?
      ORDER BY g.created_at DESC
    `,
    [gradeType, userId]
  );
  return rows;
}

function registerGradeRoutes(basePath, tableName, gradeType) {
  app.get(basePath, authMiddleware, async (req, res) => {
    try {
      const rows = await getUserGradeRows(tableName, req.user.id, gradeType);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(basePath, authMiddleware, async (req, res) => {
    try {
      const { student_id, mapel_id, semester, nilai } = req.body;
      if (!student_id || !mapel_id || !semester || nilai === undefined) {
        return res.status(400).json({ error: 'Semua field wajib diisi' });
      }
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO ${tableName} (id, user_id, student_id, mapel_id, semester, nilai) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, student_id, mapel_id, semester, nilai]
      );
      res.status(201).json({ id, user_id: req.user.id, student_id, mapel_id, semester, nilai });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put(`${basePath}/:id`, authMiddleware, async (req, res) => {
    try {
      const { student_id, mapel_id, semester, nilai } = req.body;
      await pool.query(
        `UPDATE ${tableName} SET student_id = ?, mapel_id = ?, semester = ?, nilai = ? WHERE id = ? AND user_id = ?`,
        [student_id, mapel_id, semester, nilai, req.params.id, req.user.id]
      );
      res.json({ id: req.params.id, student_id, mapel_id, semester, nilai });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete(`${basePath}/:id`, authMiddleware, async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
      res.json({ message: 'Grade deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

registerGradeRoutes('/api/nilai/tugas', 'assignments', 'Tugas');
registerGradeRoutes('/api/nilai/uts', 'midterms', 'UTS');
registerGradeRoutes('/api/nilai/uas', 'finals', 'UAS');

// ============ DASHBOARD ============

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const [studentsCount] = await pool.query('SELECT COUNT(*) AS count FROM students WHERE user_id = ?', [req.user.id]);
    const [subjectsCount] = await pool.query('SELECT COUNT(*) AS count FROM mata_pelajaran WHERE user_id = ?', [req.user.id]);
    const [gradesCount] = await pool.query(
      `
        SELECT (
          (SELECT COUNT(*) FROM assignments WHERE user_id = ?) +
          (SELECT COUNT(*) FROM midterms WHERE user_id = ?) +
          (SELECT COUNT(*) FROM finals WHERE user_id = ?)
        ) AS count
      `,
      [req.user.id, req.user.id, req.user.id]
    );
    const [avgScoreRows] = await pool.query(
      `
        SELECT AVG(nilai) AS avg_score
        FROM (
          SELECT nilai FROM assignments WHERE user_id = ?
          UNION ALL
          SELECT nilai FROM midterms WHERE user_id = ?
          UNION ALL
          SELECT nilai FROM finals WHERE user_id = ?
        ) AS all_scores
      `,
      [req.user.id, req.user.id, req.user.id]
    );

    res.json({
      totalStudents: studentsCount[0].count,
      totalSubjects: subjectsCount[0].count,
      totalGrades: gradesCount[0].count,
      avgScore: Number(avgScoreRows[0].avg_score || 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN ============

app.get('/api/admin/summary', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalTeachers = await getTeacherCount();
    const [studentsRows] = await pool.query('SELECT COUNT(*) AS count FROM students');
    const [subjectsRows] = await pool.query('SELECT COUNT(*) AS count FROM mata_pelajaran');
    const allGrades = await getAllGradesForAdmin();

    res.json({
      totalTeachers,
      totalStudents: studentsRows[0].count,
      totalSubjects: subjectsRows[0].count,
      totalGrades: allGrades.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/teachers', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE role = 'teacher'
      ORDER BY name ASC, email ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/students', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.*,
        s.nama AS name,
        u.name AS teacher_name,
        u.email AS teacher_email
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/grades', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rows = await getAllGradesForAdmin();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SERVER START ============

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DB_NAME = process.env.DB_NAME || 'student_grade_hub';
const JWT_SECRET = process.env.JWT_SECRET || 'student_grade_hub_secret_key_2024';

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function buildUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'teacher',
  };
}

// JWT Auth Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Akses admin diperlukan' });
  }
  next();
}

async function ensureColumnExists(conn, tableName, columnName, definition) {
  const [rows] = await conn.query(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [DB_NAME, tableName, columnName]
  );

  if (rows.length === 0) {
    await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  }
}

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.end();

    const conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'teacher') NOT NULL DEFAULT 'teacher',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ensureColumnExists(
      conn,
      'users',
      'role',
      "role ENUM('admin', 'teacher') NOT NULL DEFAULT 'teacher' AFTER password"
    );

    // Students table dengan field lengkap
    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        nis VARCHAR(50) NOT NULL,
        nama VARCHAR(255) NOT NULL,
        kelas VARCHAR(50) NOT NULL,
        jenis_kelamin ENUM('L', 'P') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_nis_per_user (user_id, nis)
      )
    `);

    // Mata Pelajaran table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS mata_pelajaran (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        nama_mapel VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Assignments (Tugas)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE
      )
    `);

    // Midterms (UTS)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS midterms (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        UNIQUE KEY unique_uts (student_id, mapel_id, semester)
      )
    `);

    // Finals (UAS)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS finals (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        UNIQUE KEY unique_uas (student_id, mapel_id, semester)
      )
    `);

    conn.release();
    console.log('✅ Database student_grade_hub initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

async function getTeacherCount() {
  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'");
  return rows[0].count;
}

async function getAllGradesForAdmin() {
  const [rows] = await pool.query(`
    SELECT
      combined.id,
      combined.user_id,
      combined.student_id,
      combined.mapel_id,
      combined.semester,
      combined.nilai AS score,
      combined.nilai,
      combined.grade_type,
      combined.created_at,
      s.nama AS student_name,
      mp.nama_mapel AS subject_name,
      u.name AS teacher_name
    FROM (
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'Tugas' AS grade_type
      FROM assignments
      UNION ALL
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'UTS' AS grade_type
      FROM midterms
      UNION ALL
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'UAS' AS grade_type
      FROM finals
    ) AS combined
    LEFT JOIN students s ON combined.student_id = s.id
    LEFT JOIN mata_pelajaran mp ON combined.mapel_id = mp.id
    LEFT JOIN users u ON combined.user_id = u.id
    ORDER BY combined.created_at DESC
  `);

  return rows;
}

// ============ AUTH ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar' });

    const [adminCountRows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    const role = adminCountRows[0].count === 0 ? 'admin' : 'teacher';
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name || null, email, hashedPassword, role]
    );

    res.status(201).json({ message: 'Registrasi berhasil', role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email atau password salah' });

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Email atau password salah' });

    const payload = buildUserPayload(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STUDENTS (user-scoped) ============

app.get('/api/siswa', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students WHERE user_id = ? ORDER BY nama', [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/siswa', authMiddleware, async (req, res) => {
  try {
    const { nis, nama, kelas, jenis_kelamin } = req.body;
    if (!nis || !nama || !kelas || !jenis_kelamin) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO students (id, user_id, nis, nama, kelas, jenis_kelamin) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, nis, nama, kelas, jenis_kelamin]
    );
    res.status(201).json({ id, user_id: req.user.id, nis, nama, kelas, jenis_kelamin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/siswa/:id', authMiddleware, async (req, res) => {
  try {
    const { nis, nama, kelas, jenis_kelamin } = req.body;
    await pool.query(
      'UPDATE students SET nis = ?, nama = ?, kelas = ?, jenis_kelamin = ? WHERE id = ? AND user_id = ?',
      [nis, nama, kelas, jenis_kelamin, req.params.id, req.user.id]
    );
    res.json({ id: req.params.id, nis, nama, kelas, jenis_kelamin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/siswa/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MATA PELAJARAN (user-scoped) ============

app.get('/api/mapel', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mata_pelajaran WHERE user_id = ? ORDER BY nama_mapel', [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mapel', authMiddleware, async (req, res) => {
  try {
    const { nama_mapel } = req.body;
    if (!nama_mapel) return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi' });
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO mata_pelajaran (id, user_id, nama_mapel) VALUES (?, ?, ?)',
      [id, req.user.id, nama_mapel]
    );
    res.status(201).json({ id, user_id: req.user.id, nama_mapel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/mapel/:id', authMiddleware, async (req, res) => {
  try {
    const { nama_mapel } = req.body;
    await pool.query(
      'UPDATE mata_pelajaran SET nama_mapel = ? WHERE id = ? AND user_id = ?',
      [nama_mapel, req.params.id, req.user.id]
    );
    res.json({ id: req.params.id, nama_mapel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mapel/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM mata_pelajaran WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ NILAI ROUTES ============

async function getUserGradeRows(tableName, userId, gradeType) {
  const [rows] = await pool.query(
    `
      SELECT
        g.*,
        s.nama AS student_name,
        mp.nama_mapel AS subject_name,
        ? AS grade_type
      FROM ${tableName} g
      LEFT JOIN students s ON g.student_id = s.id
      LEFT JOIN mata_pelajaran mp ON g.mapel_id = mp.id
      WHERE g.user_id = ?
      ORDER BY g.created_at DESC
    `,
    [gradeType, userId]
  );
  return rows;
}

function registerGradeRoutes(basePath, tableName, gradeType) {
  app.get(basePath, authMiddleware, async (req, res) => {
    try {
      const rows = await getUserGradeRows(tableName, req.user.id, gradeType);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(basePath, authMiddleware, async (req, res) => {
    try {
      const { student_id, mapel_id, semester, nilai } = req.body;
      if (!student_id || !mapel_id || !semester || nilai === undefined) {
        return res.status(400).json({ error: 'Semua field wajib diisi' });
      }
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO ${tableName} (id, user_id, student_id, mapel_id, semester, nilai) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, student_id, mapel_id, semester, nilai]
      );
      res.status(201).json({ id, user_id: req.user.id, student_id, mapel_id, semester, nilai });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put(`${basePath}/:id`, authMiddleware, async (req, res) => {
    try {
      const { student_id, mapel_id, semester, nilai } = req.body;
      await pool.query(
        `UPDATE ${tableName} SET student_id = ?, mapel_id = ?, semester = ?, nilai = ? WHERE id = ? AND user_id = ?`,
        [student_id, mapel_id, semester, nilai, req.params.id, req.user.id]
      );
      res.json({ id: req.params.id, student_id, mapel_id, semester, nilai });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete(`${basePath}/:id`, authMiddleware, async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
      res.json({ message: 'Grade deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

registerGradeRoutes('/api/nilai/tugas', 'assignments', 'Tugas');
registerGradeRoutes('/api/nilai/uts', 'midterms', 'UTS');
registerGradeRoutes('/api/nilai/uas', 'finals', 'UAS');

// ============ DASHBOARD ============

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const [studentsCount] = await pool.query('SELECT COUNT(*) AS count FROM students WHERE user_id = ?', [req.user.id]);
    const [subjectsCount] = await pool.query('SELECT COUNT(*) AS count FROM mata_pelajaran WHERE user_id = ?', [req.user.id]);
    const [gradesCount] = await pool.query(
      `
        SELECT (
          (SELECT COUNT(*) FROM assignments WHERE user_id = ?) +
          (SELECT COUNT(*) FROM midterms WHERE user_id = ?) +
          (SELECT COUNT(*) FROM finals WHERE user_id = ?)
        ) AS count
      `,
      [req.user.id, req.user.id, req.user.id]
    );
    const [avgScoreRows] = await pool.query(
      `
        SELECT AVG(nilai) AS avg_score
        FROM (
          SELECT nilai FROM assignments WHERE user_id = ?
          UNION ALL
          SELECT nilai FROM midterms WHERE user_id = ?
          UNION ALL
          SELECT nilai FROM finals WHERE user_id = ?
        ) AS all_scores
      `,
      [req.user.id, req.user.id, req.user.id]
    );

    res.json({
      totalStudents: studentsCount[0].count,
      totalSubjects: subjectsCount[0].count,
      totalGrades: gradesCount[0].count,
      avgScore: Number(avgScoreRows[0].avg_score || 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN ============

app.get('/api/admin/summary', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalTeachers = await getTeacherCount();
    const [studentsRows] = await pool.query('SELECT COUNT(*) AS count FROM students');
    const [subjectsRows] = await pool.query('SELECT COUNT(*) AS count FROM mata_pelajaran');
    const allGrades = await getAllGradesForAdmin();

    res.json({
      totalTeachers,
      totalStudents: studentsRows[0].count,
      totalSubjects: subjectsRows[0].count,
      totalGrades: allGrades.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/teachers', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE role = 'teacher'
      ORDER BY name ASC, email ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/students', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.*,
        s.nama AS name,
        u.name AS teacher_name,
        u.email AS teacher_email
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/grades', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rows = await getAllGradesForAdmin();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SERVER START ============

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DB_NAME = process.env.DB_NAME || 'student_grade_hub';
const JWT_SECRET = process.env.JWT_SECRET || 'student_grade_hub_secret_key_2024';

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function buildUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'teacher',
  };
}

// JWT Auth Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Akses admin diperlukan' });
  }
  next();
}

async function ensureColumnExists(conn, tableName, columnName, definition) {
  const [rows] = await conn.query(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [DB_NAME, tableName, columnName]
  );

  if (rows.length === 0) {
    await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  }
}

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.end();

    const conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'teacher') NOT NULL DEFAULT 'teacher',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ensureColumnExists(
      conn,
      'users',
      'role',
      "role ENUM('admin', 'teacher') NOT NULL DEFAULT 'teacher' AFTER password"
    );

    // Students table dengan field lengkap
    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        nis VARCHAR(50) NOT NULL,
        nama VARCHAR(255) NOT NULL,
        kelas VARCHAR(50) NOT NULL,
        jenis_kelamin ENUM('L', 'P') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_nis_per_user (user_id, nis)
      )
    `);

    // Mata Pelajaran table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS mata_pelajaran (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        nama_mapel VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Assignments (Tugas)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE
      )
    `);

    // Midterms (UTS)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS midterms (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        UNIQUE KEY unique_uts (student_id, mapel_id, semester)
      )
    `);

    // Finals (UAS)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS finals (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id INT NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        UNIQUE KEY unique_uas (student_id, mapel_id, semester)
      )
    `);

    conn.release();
    console.log('✅ Database student_grade_hub initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

async function getTeacherCount() {
  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'");
  return rows[0].count;
}

async function getAllGradesForAdmin() {
  const [rows] = await pool.query(`
    SELECT
      combined.id,
      combined.user_id,
      combined.student_id,
      combined.mapel_id,
      combined.semester,
      combined.nilai AS score,
      combined.grade_type,
      combined.created_at,
      s.nama AS student_name,
      mp.nama_mapel AS subject_name,
      u.name AS teacher_name
    FROM (
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'Tugas' AS grade_type
      FROM assignments
      UNION ALL
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'UTS' AS grade_type
      FROM midterms
      UNION ALL
      SELECT id, user_id, student_id, mapel_id, semester, nilai, created_at, 'UAS' AS grade_type
      FROM finals
    ) AS combined
    LEFT JOIN students s ON combined.student_id = s.id
    LEFT JOIN mata_pelajaran mp ON combined.mapel_id = mp.id
    LEFT JOIN users u ON combined.user_id = u.id
    ORDER BY combined.created_at DESC
  `);

  return rows;
}

// ============ AUTH ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar' });

    const [adminCountRows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    const role = adminCountRows[0].count === 0 ? 'admin' : 'teacher';
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name || null, email, hashedPassword, role]
    );

    res.status(201).json({ message: 'Registrasi berhasil', role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email atau password salah' });

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Email atau password salah' });

    const payload = buildUserPayload(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STUDENTS (user-scoped) - CORRECT ROUTES ============

// GET /api/siswa
app.get('/api/siswa', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students WHERE user_id = ? ORDER BY nama', [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/siswa
app.post('/api/siswa', authMiddleware, async (req, res) => {
  try {
    const { nis, nama, kelas, jenis_kelamin } = req.body;
    if (!nis || !nama || !kelas || !jenis_kelamin) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO students (id, user_id, nis, nama, kelas, jenis_kelamin) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, nis, nama, kelas, jenis_kelamin]
    );
    res.status(201).json({ id, user_id: req.user.id, nis, nama, kelas, jenis_kelamin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/siswa/:id
app.put('/api/siswa/:id', authMiddleware, async (req, res) => {
  try {
    const { nis, nama, kelas, jenis_kelamin } = req.body;
    await pool.query(
      'UPDATE students SET nis = ?, nama = ?, kelas = ?, jenis_kelamin = ? WHERE id = ? AND user_id = ?',
      [nis, nama, kelas, jenis_kelamin, req.params.id, req.user.id]
    );
    res.json({ id: req.params.id, nis, nama, kelas, jenis_kelamin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/siswa/:id
app.delete('/api/siswa/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MATA PELAJARAN (user-scoped) - CORRECT ROUTES ============

// GET /api/mapel
app.get('/api/mapel', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mata_pelajaran WHERE user_id = ? ORDER BY nama_mapel', [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mapel
app.post('/api/mapel', authMiddleware, async (req, res) => {
  try {
    const { nama_mapel } = req.body;
    if (!nama_mapel) return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi' });
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO mata_pelajaran (id, user_id, nama_mapel) VALUES (?, ?, ?)',
      [id, req.user.id, nama_mapel]
    );
    res.status(201).json({ id, user_id: req.user.id, nama_mapel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/mapel/:id
app.put('/api/mapel/:id', authMiddleware, async (req, res) => {
  try {
    const { nama_mapel } = req.body;
    await pool.query(
      'UPDATE mata_pelajaran SET nama_mapel = ? WHERE id = ? AND user_id = ?',
      [nama_mapel, req.params.id, req.user.id]
    );
    res.json({ id: req.params.id, nama_mapel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/mapel/:id
app.delete('/api/mapel/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM mata_pelajaran WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ NILAI (user-scoped) - TUGAS/UTS/UAS ROUTES ============
async function getUserGradeRows(tableName, userId, gradeType) {
  const [rows] = await pool.query(
    `
      SELECT
        g.*,
        s.nama AS student_name,
        mp.nama_mapel AS subject_name,
        ? AS grade_type
      FROM ${tableName} g
      LEFT JOIN students s ON g.student_id = s.id
      LEFT JOIN mata_pelajaran mp ON g.mapel_id = mp.id
      WHERE g.user_id = ?
      ORDER BY g.created_at DESC
    `,
    [gradeType, userId]
  );

  return rows;
}

function registerGradeRoutes(basePath, tableName, gradeType) {
  app.get(basePath, authMiddleware, async (req, res) => {
    try {
      const rows = await getUserGradeRows(tableName, req.user.id, gradeType);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(basePath, authMiddleware, async (req, res) => {
    try {
      const { student_id, mapel_id, semester, nilai } = req.body;
      if (!student_id || !mapel_id || !semester || nilai === undefined) {
        return res.status(400).json({ error: 'Semua field wajib diisi' });
      }

      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO ${tableName} (id, user_id, student_id, mapel_id, semester, nilai) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, student_id, mapel_id, semester, nilai]
      );

      res.status(201).json({ id, user_id: req.user.id, student_id, mapel_id, semester, nilai });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put(`${basePath}/:id`, authMiddleware, async (req, res) => {
    try {
      const { student_id, mapel_id, semester, nilai } = req.body;
      await pool.query(
        `UPDATE ${tableName} SET student_id = ?, mapel_id = ?, semester = ?, nilai = ? WHERE id = ? AND user_id = ?`,
        [student_id, mapel_id, semester, nilai, req.params.id, req.user.id]
      );

      res.json({ id: req.params.id, student_id, mapel_id, semester, nilai });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete(`${basePath}/:id`, authMiddleware, async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
      res.json({ message: 'Grade deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

registerGradeRoutes('/api/nilai/tugas', 'assignments', 'Tugas');
registerGradeRoutes('/api/nilai/uts', 'midterms', 'UTS');
registerGradeRoutes('/api/nilai/uas', 'finals', 'UAS');

// ============ DASHBOARD ============

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const [studentsCount] = await pool.query('SELECT COUNT(*) AS count FROM students WHERE user_id = ?', [req.user.id]);
    const [subjectsCount] = await pool.query('SELECT COUNT(*) AS count FROM mata_pelajaran WHERE user_id = ?', [req.user.id]);
    const [gradesCount] = await pool.query(
      `
        SELECT (
          (SELECT COUNT(*) FROM assignments WHERE user_id = ?) +
          (SELECT COUNT(*) FROM midterms WHERE user_id = ?) +
          (SELECT COUNT(*) FROM finals WHERE user_id = ?)
        ) AS count
      `,
      [req.user.id, req.user.id, req.user.id]
    );
    const [avgScoreRows] = await pool.query(
      `
        SELECT AVG(nilai) AS avg_score
        FROM (
          SELECT nilai FROM assignments WHERE user_id = ?
          UNION ALL
          SELECT nilai FROM midterms WHERE user_id = ?
          UNION ALL
          SELECT nilai FROM finals WHERE user_id = ?
        ) AS all_scores
      `,
      [req.user.id, req.user.id, req.user.id]
    );
    const grades = await getAllGradesForAdmin();
    const userGrades = grades.filter((grade) => grade.user_id === req.user.id);

    res.json({
      totalStudents: studentsCount[0].count,
      totalSubjects: subjectsCount[0].count,
      totalGrades: gradesCount[0].count,
      avgScore: Number(avgScoreRows[0].avg_score || 0),
      grades: userGrades
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN ============

app.get('/api/admin/summary', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalTeachers = await getTeacherCount();
    const [studentsRows] = await pool.query('SELECT COUNT(*) AS count FROM students');
    const [subjectsRows] = await pool.query('SELECT COUNT(*) AS count FROM mata_pelajaran');
    const allGrades = await getAllGradesForAdmin();

    res.json({
      totalTeachers,
      totalStudents: studentsRows[0].count,
      totalSubjects: subjectsRows[0].count,
      totalGrades: allGrades.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/teachers', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE role = 'teacher'
      ORDER BY name ASC, email ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/students', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.*,
        s.nama AS name,
        u.name AS teacher_name,
        u.email AS teacher_email
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/grades', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rows = await getAllGradesForAdmin();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SERVER START ============

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);

    res.json({
      totalTeachers,
      totalStudents: studentsRows[0].count,
      totalSubjects: subjectsRows[0].count,
      totalGrades: allGrades.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/teachers', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE role = 'teacher'
      ORDER BY name ASC, email ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/students', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.*,
        s.nama AS name,
        u.name AS teacher_name,
        u.email AS teacher_email
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/grades', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rows = await getAllGradesForAdmin();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
