# Admin Role Setup Instructions

## Overview
This guide explains how to set up the admin role in your Student Grade Hub system.

## Database Migration

### Step 1: Run the Migration
First, apply the database migration to add the role column:

```bash
# Using MySQL CLI
mysql -h localhost -u root student_grade_hub < database/add_role_column.sql
```

Or manually run in MySQL Workbench or phpMyAdmin:
```sql
ALTER TABLE users ADD COLUMN role ENUM('admin', 'teacher') NOT NULL DEFAULT 'teacher' AFTER email;
CREATE INDEX idx_users_role ON users(role);
```

### Step 2: Restart the Backend
The backend will automatically create the role column when it initializes if running for the first time, but if users table already exists, run the migration above.

```bash
cd backend
npm install  # if not already installed
npm run dev
```

## Creating an Admin Account

### Method 1: Register and Update Database (Recommended for Development)

1. Register a new user through the UI:
   - Go to `/register`
   - Create account with email: `admin@example.com`

2. Update the role in the database:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
   ```

### Method 2: Direct Database Insert

Create an admin account directly in the database:

```sql
-- First, hash a password using bcryptjs
-- You can use this snippet in Node.js:
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('your_password', 10).then(console.log);
-- Or use an online bcrypt generator

INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@example.com', '$2a$10$...', 'admin');
```

### Method 3: Use the API

```bash
# 1. Register as normal user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "secure_password"
  }'

# 2. Then update role in database
# mysql> UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## Testing Admin Features

### 1. Login as Admin
- Go to `/login`
- Enter admin credentials
- You'll be automatically redirected to `/admin`

### 2. Admin Dashboard Features
The admin panel provides:
- **Total Guru**: Count of all teachers
- **Total Siswa**: Count of all students across all teachers
- **Mata Pelajaran**: Count of all subjects
- **Total Nilai**: Count of all grades

### 3. Viewing All Data
- **All Students**: Filter by teacher or search by name
- **All Grades**: View grades from all teachers with distribution charts
- **Grade Distribution**: Visual charts showing grade breakdown

### 4. Filter Options
Admin can filter data by:
- Selecting specific teacher from dropdown
- Searching student names

## Teacher vs Admin Access

### Teacher Access
- Can only view their own students, subjects, and grades
- Dashboard shows only their data
- Cannot access admin panel
- Suggested data for teachers: 1 teacher → 10-20 students → 5 subjects, etc.

### Admin Access
- Sees all students from all teachers
- Sees all subjects from all teachers
- Sees all grades
- Can view student/grade details by teacher
- Has access to `/admin` panel with comprehensive overview

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (default role: teacher)
- `POST /api/auth/login` - Login (returns user with role)
- `GET /api/auth/profile` - Get user profile with role

### Admin Endpoints
- `GET /api/admin/teachers` - Get list of all teachers (admin only)
- `GET /api/admin/summary` - Get summary stats (admin only)

### Role-Based Data Endpoints
- `GET /api/students` - Admin: all students | Teacher: own students
- `GET /api/subjects` - Admin: all subjects | Teacher: own subjects
- `GET /api/grades` - Admin: all grades | Teacher: own grades
- `GET /api/dashboard/stats` - Admin: all stats | Teacher: own stats

## Default Behavior

### New User Registration
- All new users are created with role = 'teacher'
- To make a user admin, manually update the database

### Login Redirect
- **Admin users**: Redirected to `/admin` after login
- **Teacher users**: Redirected to `/` (Dashboard) after login

## Security Notes

1. Admin routes are protected with `checkRole('admin')` middleware
2. Teachers cannot access admin endpoints (403 Forbidden)
3. All queries include role-based filtering
4. Admin role is stored in JWT token for quick access checks

## Testing Checklist

- [ ] Can register new user (becomes teacher by default)
- [ ] Can login as teacher (redirects to `/`)
- [ ] Can login as admin (redirects to `/admin`)
- [ ] Teacher can only see their own data
- [ ] Admin can see all data
- [ ] Admin can filter by teacher
- [ ] Admin panel shows correct statistics
- [ ] Grade distribution charts work properly
- [ ] Cannot access `/admin` as teacher (should show empty or redirect)

## Troubleshooting

### Admin Panel Not Showing
- Clear browser cache and localStorage
- Verify role in database: `SELECT id, email, role FROM users;`
- Check JWT token includes role: Use browser DevTools → Application → Cookies → auth_token

### Cannot See All Data
- Verify you're logged in as admin
- Check database has `role` column: `DESCRIBE users;`
- Restart backend to ensure middleware is loaded

### Login Redirect Not Working
- Check auth context is updated with role
- Verify Login.tsx useEffect hook is working
- Check browser console for errors

## Support

For issues, check:
1. Backend logs for API errors
2. Browser console for frontend errors
3. Database records: `SELECT * FROM users;`
4. Network tab for API responses
