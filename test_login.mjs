import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'tharunkiruthik0018@gmail.com',
    password: 'Password@123',
  });
  
  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login successful!", data.user.id);
  }
}

testLogin();
