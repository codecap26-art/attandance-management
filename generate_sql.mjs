import fs from 'fs';
import { parse } from 'csv-parse/sync';

async function main() {
  console.log('Generating inserts.sql...');
  let sql = 'BEGIN;\n';

  // 1. Admins
  const admins = [
    { email: 'tharunkiruthik0018@gmail.com', password: 'Password@123' },
    { email: 'psdesignseries@bitsathy.ac.in', password: 'Password@123' },
  ];

  for (const admin of admins) {
    sql += `
      DO $$
      DECLARE
        new_id uuid;
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '${admin.email}') THEN
          INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
            recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
            is_super_admin, created_at, updated_at, phone, phone_confirmed_at, 
            email_change, email_change_confirm_status
          ) VALUES (
            uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
            '${admin.email}', crypt('${admin.password}', gen_salt('bf')), NOW(), 
            NULL, NULL, '{"provider":"email","providers":["email"]}', '{}', 
            FALSE, NOW(), NOW(), NULL, NULL, '', 0
          ) RETURNING id INTO new_id;
          
          INSERT INTO user_roles (user_id, email, role)
          VALUES (new_id, '${admin.email}', 'admin');
        ELSE
          INSERT INTO user_roles (user_id, email, role)
          SELECT id, '${admin.email}', 'admin' FROM auth.users WHERE email = '${admin.email}'
          ON CONFLICT (user_id) DO NOTHING;
        END IF;
      END $$;
    `;
    
    // Fallback if user already exists
    sql += `
      INSERT INTO user_roles (user_id, email, role)
      SELECT id, '${admin.email}', 'admin' FROM auth.users WHERE email = '${admin.email}'
      ON CONFLICT (user_id) DO NOTHING;
    `;
  }

  // 2. Students array
  const csvFormat = fs.readFileSync('All year student data base - Sheet1.csv', 'utf8');
  const records = parse(csvFormat, { columns: true, skip_empty_lines: true });

  for (const r of records) {
      const regNo = r['Roll Number']?.replace(/'/g, "''");
      const name = r['Name']?.replace(/'/g, "''");
      const email = r['Email Id']?.replace(/'/g, "''");
      if (regNo && name) {
        sql += `INSERT INTO students (full_name, reg_no, email) VALUES ('${name}', '${regNo}', '${email}') ON CONFLICT (reg_no) DO NOTHING;\n`;
      }
  }

  sql += 'COMMIT;\n';
  fs.writeFileSync('inserts.sql', sql);
  console.log('inserts.sql generated!');
}

main();
