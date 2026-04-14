-- =====================================================
-- ADD ROLE COLUMN TO USERS TABLE
-- =====================================================

-- Add role column to users table with default value 'teacher'
ALTER TABLE users ADD COLUMN role ENUM('admin', 'teacher') NOT NULL DEFAULT 'teacher' AFTER email;

-- Create an admin account (you should change the password)
-- Email: admin@example.com, Password: will be hashed by the application
-- Run registrations through the API after adding this column OR manually insert with hashed password

-- Index for better query performance
CREATE INDEX idx_users_role ON users(role);

-- Verify the column was added
-- SELECT id, name, email, role FROM users;
