# Backend Setup Instructions

## Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Edit `.env` with your MySQL credentials:
```
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rekap_nilai_db
```

4. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## What happens on first run?

The server will automatically:
1. ✅ Create the `rekap_nilai_db` database if it doesn't exist
2. ✅ Create all required tables (siswa, mata_pelajaran, nilai_tugas, nilai_uts, nilai_uas)
3. ✅ Set up foreign keys and indexes
4. ✅ Start accepting API requests

No manual SQL imports needed!

## API Endpoints

### Students (Siswa)
- `GET /api/siswa` - Get all students
- `GET /api/siswa/:id` - Get student by ID
- `POST /api/siswa` - Create new student
- `PUT /api/siswa/:id` - Update student
- `DELETE /api/siswa/:id` - Delete student

### Subjects (Mata Pelajaran)
- `GET /api/mapel` - Get all subjects
- `POST /api/mapel` - Create new subject
- `PUT /api/mapel/:id` - Update subject
- `DELETE /api/mapel/:id` - Delete subject

### Grades (Nilai)
- `GET /api/nilai/detail?siswaId=&mapelId=&semester=` - Get detailed grades
- `GET /api/nilai/tugas` - Get all assignments
- `POST /api/nilai/tugas` - Create assignment
- `PUT /api/nilai/tugas/:id` - Update assignment
- `DELETE /api/nilai/tugas/:id` - Delete assignment
- `GET /api/nilai/uts` - Get all midterms
- `POST /api/nilai/uts` - Create midterm
- `PUT /api/nilai/uts/:id` - Update midterm
- `DELETE /api/nilai/uts/:id` - Delete midterm
- `GET /api/nilai/uas` - Get all finals
- `POST /api/nilai/uas` - Create final
- `PUT /api/nilai/uas/:id` - Update final
- `DELETE /api/nilai/uas/:id` - Delete final

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Testing

Server will be available at: `http://localhost:3001`

Test with curl:
```bash
curl http://localhost:3001/api/siswa
```
