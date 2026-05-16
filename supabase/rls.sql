-- ============================================================
-- Row Level Security (RLS) Policies
-- AI-Powered College Attendance Management System
-- ============================================================

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE user_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: get current user's role
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if email domain is allowed
CREATE OR REPLACE FUNCTION is_allowed_domain()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() ->> 'email') LIKE '%@college.edu';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES: user_roles
-- ============================================================

-- Users can read their own role
CREATE POLICY "user_roles_self_select" ON user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Only admins can insert/update/delete roles
CREATE POLICY "user_roles_admin_all" ON user_roles
  FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================================
-- POLICIES: students
-- ============================================================

-- All authenticated users can read students
CREATE POLICY "students_authenticated_select" ON students
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert students
CREATE POLICY "students_admin_insert" ON students
  FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can update students
CREATE POLICY "students_admin_update" ON students
  FOR UPDATE
  USING (get_user_role() = 'admin');

-- Only admins can delete students
CREATE POLICY "students_admin_delete" ON students
  FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================================
-- POLICIES: categories
-- ============================================================

-- All authenticated users can read active categories
CREATE POLICY "categories_authenticated_select" ON categories
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can manage categories
CREATE POLICY "categories_admin_insert" ON categories
  FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "categories_admin_update" ON categories
  FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "categories_admin_delete" ON categories
  FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================================
-- POLICIES: attendance_logs
-- ============================================================

-- All authenticated users can read attendance logs
CREATE POLICY "attendance_authenticated_select" ON attendance_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Faculty, mentors, AND admins can insert attendance
CREATE POLICY "attendance_staff_insert" ON attendance_logs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    get_user_role() IN ('faculty', 'mentor', 'admin')
  );

-- Only admins can update attendance
CREATE POLICY "attendance_admin_update" ON attendance_logs
  FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete attendance
CREATE POLICY "attendance_admin_delete" ON attendance_logs
  FOR DELETE
  USING (get_user_role() = 'admin');
