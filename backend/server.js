const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rekap_nilai_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Simple token store (in production, use Redis or DB sessions)
const sessions = new Map();

function generateToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = sessions.get(token);
  next();
}

// Initialize database and tables
async function initializeDatabase() {
  try {

    const conn = await pool.getConnection();
    
    // Table: users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role ENUM('admin','guru') DEFAULT 'guru',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table: students
    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        nis VARCHAR(50) UNIQUE NOT NULL,
        nama VARCHAR(255) NOT NULL,
        kelas VARCHAR(50) NOT NULL,
        jenis_kelamin ENUM('L', 'P') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS mata_pelajaran (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        nama_mapel VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        keterangan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS midterms (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        UNIQUE KEY unique_uts (student_id, mapel_id, semester)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS finals (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        student_id VARCHAR(36) NOT NULL,
        mapel_id VARCHAR(36) NOT NULL,
        semester VARCHAR(50) NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        UNIQUE KEY unique_uas (student_id, mapel_id, semester)
      )
    `);

    conn.release();
    console.log('✅ Database and tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// ============ AUTH ROUTES ============

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name || null, email, password]
    );

    res.status(201).json({ message: 'Registrasi berhasil', user: { id: result.insertId, name, email, role: 'guru' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = rows[0];
    const token = generateToken();
    sessions.set(token, { id: user.id, name: user.name, email: user.email, role: user.role });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/profile
app.get('/api/auth/profile', authMiddleware, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ message: 'Logout berhasil' });
});

// ============ STUDENTS ROUTES ============

// GET all students
app.get('/api/siswa', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students ORDER BY nama');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET student by id
app.get('/api/siswa/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new student
app.post('/api/siswa', async (req, res) => {
  try {
    const { nis, nama, kelas, jenis_kelamin } = req.body;
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO students (id, nis, nama, kelas, jenis_kelamin) VALUES (?, ?, ?, ?, ?)',
      [id, nis, nama, kelas, jenis_kelamin]
    );
    res.status(201).json({ id, nis, nama, kelas, jenis_kelamin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update student
app.put('/api/siswa/:id', async (req, res) => {
  try {
    const { nis, nama, kelas, jenis_kelamin } = req.body;
    await pool.query(
      'UPDATE students SET nis = ?, nama = ?, kelas = ?, jenis_kelamin = ? WHERE id = ?',
      [nis, nama, kelas, jenis_kelamin, req.params.id]
    );
    res.json({ id: req.params.id, nis, nama, kelas, jenis_kelamin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE student
app.delete('/api/siswa/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MATA PELAJARAN ROUTES ============

// GET all subjects
app.get('/api/mapel', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mata_pelajaran ORDER BY nama_mapel');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new subject
app.post('/api/mapel', async (req, res) => {
  try {
    const { nama_mapel } = req.body;
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO mata_pelajaran (id, nama_mapel) VALUES (?, ?)',
      [id, nama_mapel]
    );
    res.status(201).json({ id, nama_mapel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update subject
app.put('/api/mapel/:id', async (req, res) => {
  try {
    const { nama_mapel } = req.body;
    await pool.query(
      'UPDATE mata_pelajaran SET nama_mapel = ? WHERE id = ?',
      [nama_mapel, req.params.id]
    );
    res.json({ id: req.params.id, nama_mapel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE subject
app.delete('/api/mapel/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM mata_pelajaran WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ NILAI ROUTES ============

// GET all assignments
app.get('/api/nilai/tugas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, s.nama as student_name, s.kelas, m.nama_mapel
      FROM assignments a
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN mata_pelajaran m ON a.mapel_id = m.id
      ORDER BY a.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST assignment
app.post('/api/nilai/tugas', async (req, res) => {
  try {
    const { student_id, mapel_id, semester, nilai, keterangan } = req.body;
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO assignments (id, student_id, mapel_id, semester, nilai, keterangan) VALUES (?, ?, ?, ?, ?, ?)',
      [id, student_id, mapel_id, semester, nilai, keterangan]
    );
    res.status(201).json({ id, student_id, mapel_id, semester, nilai, keterangan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update assignment
app.put('/api/nilai/tugas/:id', async (req, res) => {
  try {
    const { student_id, mapel_id, semester, nilai, keterangan } = req.body;
    await pool.query(
      'UPDATE assignments SET student_id = ?, mapel_id = ?, semester = ?, nilai = ?, keterangan = ? WHERE id = ?',
      [student_id, mapel_id, semester, nilai, keterangan, req.params.id]
    );
    res.json({ id: req.params.id, student_id, mapel_id, semester, nilai, keterangan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE assignment
app.delete('/api/nilai/tugas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all midterms
app.get('/api/nilai/uts', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, s.nama as student_name, s.kelas, mp.nama_mapel
      FROM midterms m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN mata_pelajaran mp ON m.mapel_id = mp.id
      ORDER BY m.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST midterm
app.post('/api/nilai/uts', async (req, res) => {
  try {
    const { student_id, mapel_id, semester, nilai } = req.body;
    
    // Check if already exists
    const [existing] = await pool.query(
      'SELECT id FROM midterms WHERE student_id = ? AND mapel_id = ? AND semester = ?',
      [student_id, mapel_id, semester]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'UTS sudah ada untuk siswa, mata pelajaran, dan semester ini' });
    }
    
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO midterms (id, student_id, mapel_id, semester, nilai) VALUES (?, ?, ?, ?, ?)',
      [id, student_id, mapel_id, semester, nilai]
    );
    res.status(201).json({ id, student_id, mapel_id, semester, nilai });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update midterm
app.put('/api/nilai/uts/:id', async (req, res) => {
  try {
    const { student_id, mapel_id, semester, nilai } = req.body;
    await pool.query(
      'UPDATE midterms SET student_id = ?, mapel_id = ?, semester = ?, nilai = ? WHERE id = ?',
      [student_id, mapel_id, semester, nilai, req.params.id]
    );
    res.json({ id: req.params.id, student_id, mapel_id, semester, nilai });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE midterm
app.delete('/api/nilai/uts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM midterms WHERE id = ?', [req.params.id]);
    res.json({ message: 'Midterm deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all finals
app.get('/api/nilai/uas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*, s.nama as student_name, s.kelas, mp.nama_mapel
      FROM finals f
      LEFT JOIN students s ON f.student_id = s.id
      LEFT JOIN mata_pelajaran mp ON f.mapel_id = mp.id
      ORDER BY f.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST final
app.post('/api/nilai/uas', async (req, res) => {
  try {
    const { student_id, mapel_id, semester, nilai } = req.body;
    
    // Check if already exists
    const [existing] = await pool.query(
      'SELECT id FROM finals WHERE student_id = ? AND mapel_id = ? AND semester = ?',
      [student_id, mapel_id, semester]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'UAS sudah ada untuk siswa, mata pelajaran, dan semester ini' });
    }
    
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO finals (id, student_id, mapel_id, semester, nilai) VALUES (?, ?, ?, ?, ?)',
      [id, student_id, mapel_id, semester, nilai]
    );
    res.status(201).json({ id, student_id, mapel_id, semester, nilai });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update final
app.put('/api/nilai/uas/:id', async (req, res) => {
  try {
    const { student_id, mapel_id, semester, nilai } = req.body;
    await pool.query(
      'UPDATE finals SET student_id = ?, mapel_id = ?, semester = ?, nilai = ? WHERE id = ?',
      [student_id, mapel_id, semester, nilai, req.params.id]
    );
    res.json({ id: req.params.id, student_id, mapel_id, semester, nilai });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE final
app.delete('/api/nilai/uas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM finals WHERE id = ?', [req.params.id]);
    res.json({ message: 'Final exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD STATS ============

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [studentsCount] = await pool.query('SELECT COUNT(*) as count FROM students');
    const [avgTugas] = await pool.query('SELECT AVG(nilai) as avg FROM assignments');
    const [avgUts] = await pool.query('SELECT AVG(nilai) as avg FROM midterms');
    const [avgUas] = await pool.query('SELECT AVG(nilai) as avg FROM finals');
    const [students] = await pool.query('SELECT * FROM students');
    const [assignments] = await pool.query('SELECT * FROM assignments');
    const [midterms] = await pool.query('SELECT * FROM midterms');
    const [finals] = await pool.query('SELECT * FROM finals');

    res.json({
      totalStudents: studentsCount[0].count,
      avgAssignments: avgTugas[0].avg || 0,
      avgMidterms: avgUts[0].avg || 0,
      avgFinals: avgUas[0].avg || 0,
      students,
      assignments,
      midterms,
      finals
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DETAIL NILAI ============

app.get('/api/nilai/detail', async (req, res) => {
  try {
    const { student_id, semester, mapel_id } = req.query;
    
    let assignmentQuery = 'SELECT a.*, m.nama_mapel FROM assignments a LEFT JOIN mata_pelajaran m ON a.mapel_id = m.id WHERE a.student_id = ? AND a.semester = ?';
    let midtermQuery = 'SELECT m.*, mp.nama_mapel FROM midterms m LEFT JOIN mata_pelajaran mp ON m.mapel_id = mp.id WHERE m.student_id = ? AND m.semester = ?';
    let finalQuery = 'SELECT f.*, mp.nama_mapel FROM finals f LEFT JOIN mata_pelajaran mp ON f.mapel_id = mp.id WHERE f.student_id = ? AND f.semester = ?';
    
    const params = [student_id, semester];
    
    if (mapel_id) {
      assignmentQuery += ' AND a.mapel_id = ?';
      midtermQuery += ' AND m.mapel_id = ?';
      finalQuery += ' AND f.mapel_id = ?';
      params.push(mapel_id);
    }

    const [assignments] = await pool.query(assignmentQuery, params);
    const [midterms] = await pool.query(midtermQuery, params);
    const [finals] = await pool.query(finalQuery, params);

    res.json({ assignments, midterms, finals });
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
