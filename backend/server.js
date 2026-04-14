const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'student_grade_hub_secret_key_2024';

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_grade_hub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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

// Role Check Middleware
function checkRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang dapat mengakses.' });
    }
    next();
  };
}

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'student_grade_hub'}\``);
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

    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        student_id INT NOT NULL,
        subject_id INT NOT NULL,
        score INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )
    `);

    conn.release();
    console.log('✅ Database student_grade_hub initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// ============ AUTH ============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name || null, email, hashedPassword, 'teacher']
    );

    res.status(201).json({ message: 'Registrasi berhasil' });
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

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
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

// ============ STUDENTS (user-scoped or admin) ============

app.get('/api/students', authMiddleware, async (req, res) => {
  try {
    let query = 'SELECT * FROM students';
    const params = [];
    
    if (req.user.role === 'teacher') {
      query += ' WHERE user_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY name';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', authMiddleware, async (req, res) => {
  try {
    const { name, user_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama siswa wajib diisi' });
    
    // Admin can create for any user, teacher only for themselves
    const targetUserId = req.user.role === 'admin' && user_id ? user_id : req.user.id;
    
    const [result] = await pool.query('INSERT INTO students (user_id, name) VALUES (?, ?)', [targetUserId, name]);
    res.status(201).json({ id: result.insertId, user_id: targetUserId, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/students/:id', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    let query = 'UPDATE students SET name = ? WHERE id = ?';
    const params = [name, req.params.id];
    
    if (req.user.role === 'teacher') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    await pool.query(query, params);
    res.json({ id: Number(req.params.id), name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/students/:id', authMiddleware, async (req, res) => {
  try {
    let query = 'DELETE FROM students WHERE id = ?';
    const params = [req.params.id];
    
    if (req.user.role === 'teacher') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    await pool.query(query, params);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SUBJECTS (user-scoped or admin) ============

app.get('/api/subjects', authMiddleware, async (req, res) => {
  try {
    let query = 'SELECT * FROM subjects';
    const params = [];
    
    if (req.user.role === 'teacher') {
      query += ' WHERE user_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY name';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subjects', authMiddleware, async (req, res) => {
  try {
    const { name, user_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi' });
    
    const targetUserId = req.user.role === 'admin' && user_id ? user_id : req.user.id;
    
    const [result] = await pool.query('INSERT INTO subjects (user_id, name) VALUES (?, ?)', [targetUserId, name]);
    res.status(201).json({ id: result.insertId, user_id: targetUserId, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/subjects/:id', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    let query = 'UPDATE subjects SET name = ? WHERE id = ?';
    const params = [name, req.params.id];
    
    if (req.user.role === 'teacher') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    await pool.query(query, params);
    res.json({ id: Number(req.params.id), name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/subjects/:id', authMiddleware, async (req, res) => {
  try {
    let query = 'DELETE FROM subjects WHERE id = ?';
    const params = [req.params.id];
    
    if (req.user.role === 'teacher') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    await pool.query(query, params);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GRADES (user-scoped or admin) ============

app.get('/api/grades', authMiddleware, async (req, res) => {
  try {
    let query = `
      SELECT g.*, s.name as student_name, sub.name as subject_name, u.name as teacher_name
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.id
      LEFT JOIN subjects sub ON g.subject_id = sub.id
      LEFT JOIN users u ON g.user_id = u.id
    `;
    const params = [];
    
    if (req.user.role === 'teacher') {
      query += ' WHERE g.user_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY g.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/grades', authMiddleware, async (req, res) => {
  try {
    const { student_id, subject_id, score, user_id } = req.body;
    if (!student_id || !subject_id || score === undefined) {
      return res.status(400).json({ error: 'Siswa, mata pelajaran, dan nilai wajib diisi' });
    }
    const targetUserId = req.user.role === 'admin' && user_id ? user_id : req.user.id;
    
    const [result] = await pool.query(
      'INSERT INTO grades (user_id, student_id, subject_id, score) VALUES (?, ?, ?, ?)',
      [targetUserId, student_id, subject_id, score]
    );
    res.status(201).json({ id: result.insertId, user_id: targetUserId, student_id, subject_id, score });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/grades/:id', authMiddleware, async (req, res) => {
  try {
    const { student_id, subject_id, score } = req.body;
    let query = 'UPDATE grades SET student_id = ?, subject_id = ?, score = ? WHERE id = ?';
    const params = [student_id, subject_id, score, req.params.id];
    
    if (req.user.role === 'teacher') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    await pool.query(query, params);
    res.json({ id: Number(req.params.id), student_id, subject_id, score });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/grades/:id', authMiddleware, async (req, res) => {
  try {
    let query = 'DELETE FROM grades WHERE id = ?';
    const params = [req.params.id];
    
    if (req.user.role === 'teacher') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    await pool.query(query, params);
    res.json({ message: 'Grade deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD ============

app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;
    
    let studentQuery = 'SELECT COUNT(*) as count FROM students';
    let subjectQuery = 'SELECT COUNT(*) as count FROM subjects';
    let gradesCountQuery = 'SELECT COUNT(*) as count FROM grades';
    let avgScoreQuery = 'SELECT AVG(score) as avg FROM grades';
    let gradesQuery = `
      SELECT g.*, s.name as student_name, sub.name as subject_name, u.name as teacher_name
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.id
      LEFT JOIN subjects sub ON g.subject_id = sub.id
      LEFT JOIN users u ON g.user_id = u.id
    `;
    
    if (!isAdmin) {
      studentQuery += ' WHERE user_id = ?';
      subjectQuery += ' WHERE user_id = ?';
      gradesCountQuery += ' WHERE user_id = ?';
      avgScoreQuery += ' WHERE user_id = ?';
      gradesQuery += ' WHERE g.user_id = ?';
    }
    
    const [studentsCount] = await pool.query(studentQuery, isAdmin ? [] : [userId]);
    const [subjectsCount] = await pool.query(subjectQuery, isAdmin ? [] : [userId]);
    const [gradesCount] = await pool.query(gradesCountQuery, isAdmin ? [] : [userId]);
    const [avgScore] = await pool.query(avgScoreQuery, isAdmin ? [] : [userId]);
    const [grades] = await pool.query(gradesQuery, isAdmin ? [] : [userId]);

    res.json({
      totalStudents: studentsCount[0].count,
      totalSubjects: subjectsCount[0].count,
      totalGrades: gradesCount[0].count,
      avgScore: avgScore[0].avg || 0,
      grades,
      role: req.user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN ENDPOINTS ============

// Get all teachers (admin only)
app.get('/api/admin/teachers', authMiddleware, checkRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY name',
      ['teacher']
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users count (admin only)
app.get('/api/admin/summary', authMiddleware, checkRole('admin'), async (req, res) => {
  try {
    const [teacherCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['teacher']);
    const [studentCount] = await pool.query('SELECT COUNT(*) as count FROM students');
    const [subjectCount] = await pool.query('SELECT COUNT(*) as count FROM subjects');
    const [gradeCount] = await pool.query('SELECT COUNT(*) as count FROM grades');
    
    res.json({
      totalTeachers: teacherCount[0].count,
      totalStudents: studentCount[0].count,
      totalSubjects: subjectCount[0].count,
      totalGrades: gradeCount[0].count
    });
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
