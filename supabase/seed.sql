-- ============================================================
-- Sample seed data for development/testing
-- Run AFTER schema.sql
-- ============================================================

-- Sample students (100 records for testing)
INSERT INTO students (full_name, reg_no, email) VALUES
  ('Aarav Kumar',       '21CS001', 'aarav.kumar@college.edu'),
  ('Priya Sharma',      '21CS002', 'priya.sharma@college.edu'),
  ('Rohan Mehta',       '21CS003', 'rohan.mehta@college.edu'),
  ('Sneha Patel',       '21CS004', 'sneha.patel@college.edu'),
  ('Kiran Reddy',       '21CS005', 'kiran.reddy@college.edu'),
  ('Ananya Singh',      '21CS006', 'ananya.singh@college.edu'),
  ('Vikram Nair',       '21CS007', 'vikram.nair@college.edu'),
  ('Deepika Iyer',      '21CS008', 'deepika.iyer@college.edu'),
  ('Arjun Pillai',      '21CS009', 'arjun.pillai@college.edu'),
  ('Meera Krishnan',    '21CS010', 'meera.krishnan@college.edu'),
  ('Suresh Babu',       '21EC001', 'suresh.babu@college.edu'),
  ('Lakshmi Devi',      '21EC002', 'lakshmi.devi@college.edu'),
  ('Rahul Verma',       '21EC003', 'rahul.verma@college.edu'),
  ('Pooja Gupta',       '21EC004', 'pooja.gupta@college.edu'),
  ('Amit Joshi',        '21EC005', 'amit.joshi@college.edu'),
  ('Divya Rao',         '21ME001', 'divya.rao@college.edu'),
  ('Sanjay Tiwari',     '21ME002', 'sanjay.tiwari@college.edu'),
  ('Kavya Nambiar',     '21ME003', 'kavya.nambiar@college.edu'),
  ('Aditya Shah',       '21ME004', 'aditya.shah@college.edu'),
  ('Neha Pandey',       '21ME005', 'neha.pandey@college.edu')
ON CONFLICT (reg_no) DO NOTHING;

-- NOTE: Admin user must be added via Supabase dashboard after first login:
-- INSERT INTO user_roles (user_id, email, role) VALUES ('<uid>', 'admin@college.edu', 'admin');
