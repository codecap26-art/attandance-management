-- ============================================================
-- AI-Powered College Attendance Management System
-- Supabase PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: user_roles
-- Stores role assignments for authenticated users
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('faculty', 'mentor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name  TEXT NOT NULL,
  reg_no     TEXT UNIQUE NOT NULL,
  email      TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- Attendance categories (e.g. Placement, Medical, OD, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE: attendance_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE NOT NULL,
  reg_no     TEXT NOT NULL,
  email      TEXT,
  period     INT NOT NULL CHECK (period BETWEEN 1 AND 7),
  category   TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  role       TEXT NOT NULL,
  declared   BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_attendance UNIQUE(reg_no, date, period),
  CONSTRAINT fk_student FOREIGN KEY (reg_no) REFERENCES students(reg_no) ON DELETE CASCADE
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_attendance_date     ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_reg_no   ON attendance_logs(reg_no);
CREATE INDEX IF NOT EXISTS idx_attendance_category ON attendance_logs(category);
CREATE INDEX IF NOT EXISTS idx_attendance_updated_by ON attendance_logs(updated_by);
CREATE INDEX IF NOT EXISTS idx_students_reg_no     ON students(reg_no);
CREATE INDEX IF NOT EXISTS idx_students_full_name  ON students(full_name);

-- ============================================================
-- SEED: Default categories
-- ============================================================
INSERT INTO categories (name, is_active, created_by) VALUES
  ('Placement',       true, 'system'),
  ('Medical',         true, 'system'),
  ('OD (On Duty)',    true, 'system'),
  ('Sports',          true, 'system'),
  ('Cultural Event',  true, 'system'),
  ('Exam',            true, 'system'),
  ('Other',           true, 'system')
ON CONFLICT DO NOTHING;
