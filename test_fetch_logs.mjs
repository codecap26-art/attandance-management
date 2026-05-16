import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetchLogs() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'tharunkiruthik0018@gmail.com',
    password: 'Password@123',
  });
  console.log("Auth:", authData.user?.id);

  console.log("Fetching logs...");
  const t0 = Date.now();
  const { data, error, count } = await supabase
    .from('attendance_logs')
    .select(`
      id, date, reg_no, email, period, category,
      updated_by, role, declared, created_at,
      students ( full_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, -1);
  
  console.log("Time:", Date.now() - t0, "ms");
  console.log("Error:", error);
  console.log("Count:", count);
  console.log("Data length:", data?.length);
}

testFetchLogs();
