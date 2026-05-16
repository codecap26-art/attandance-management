import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijjstnsqlpmqazhyvgyf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqanN0bnNxbHBtcWF6aHl2Z3lmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE5MDY3MCwiZXhwIjoyMDkyNzY2NjcwfQ.6DknkXKb55sU7OZrMXB_Yn5H5o_FNMGiZTfXTNty4jc';
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const admins = [
    { email: 'tharunkiruthik0018@gmail.com', password: 'Password@123' },
    { email: 'psdesignseries@bitsathy.ac.in', password: 'Password@123' },
  ];

  for (const admin of admins) {
    console.log(`Creating user ${admin.email}...`);
    const { data: userRecord, error: userError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
    });
    
    if (userError) {
      console.error('Error creating user:', userError);
      continue;
    }
    
    console.log(`Created user ${admin.email} (ID: ${userRecord.user.id})`);
    
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userRecord.user.id,
        email: admin.email,
        role: 'admin'
      });
    
    if (roleError) console.error('Role Error:', roleError);
    else console.log(`Granted admin role to ${admin.email}`);
  }
}

main();
