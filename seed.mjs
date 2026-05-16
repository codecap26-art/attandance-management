import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ijjstnsqlpmqazhyvgyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqanN0bnNxbHBtcWF6aHl2Z3lmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0Njg2NywiZXhwIjoyMDgwMDE0ODY3fQ.hNMT-pOnuId8k80NnQ4M6ZlXmYJ8Y_u0_E4M2cT2kYQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('1. Setting up Admins...');
  const admins = [
    { email: 'tharunkiruthik0018@gmail.com', password: 'Password@123' },
    { email: 'psdesignseries@bitsathy.ac.in', password: 'Password@123' },
  ];

  for (const admin of admins) {
    const { data: userRecord, error: userError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    });
    
    if (userError) {
      if (userError.message.includes('already exists') || userError.status === 422) {
          console.log(`User ${admin.email} may already exist, let's fetch...`);
      } else {
          console.error('Error creating user:', userError);
      }
    } else {
        console.log(`Created user ${admin.email} (ID: ${userRecord.user.id})`);
        
        // Insert into user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userRecord.user.id,
            email: admin.email,
            role: 'admin'
          });
        
        if (roleError) console.error('Role Error:', roleError);
        else console.log(`Granted admin role to ${admin.email}`);
    }
  }

  // Fallback check to ensure they are admins if already existed
  const { data: listUsers } = await supabase.auth.admin.listUsers();
  for (const admin of admins) {
      const existingUser = listUsers.users.find(u => u.email === admin.email);
      if (existingUser) {
          await supabase.from('user_roles').upsert({ user_id: existingUser.id, email: admin.email, role: 'admin' }, { onConflict: 'user_id' });
      }
  }

  console.log('2. Uploading Students database...');
  const csvFormat = fs.readFileSync('All year student data base - Sheet1.csv', 'utf8');
  const records = parse(csvFormat, { columns: true, skip_empty_lines: true });

  const students = records.map(r => ({
      reg_no: r['Roll Number'],
      full_name: r['Name'],
      email: r['Email Id']
  }));

  console.log(`Parsed ${students.length} students. Inserting in batches of 500...`);
  
  for (let i = 0; i < students.length; i += 500) {
      const batch = students.slice(i, i + 500);
      const { error } = await supabase.from('students').upsert(batch, { onConflict: 'reg_no', ignoreDuplicates: true });
      if (error) {
          console.error(`Batch error at ${i}:`, error);
      } else {
          console.log(`Inserted batch ${i} to ${i + batch.length}`);
      }
  }

  console.log('Done!');
}

main();
