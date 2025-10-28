import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGF0emhsaWFvcmRsc3F0amVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MTk1NzQsImV4cCI6MjA3NzA5NTU3NH0.u1VFWCN4yHZ_v_bR4MNw5wt7jTPdfpIwjhDRYfQ5qRw';

console.log('🔧 Supabase Client Config:');
console.log('URL:', supabaseUrl);
console.log('Key presente:', !!supabaseKey);
console.log('Key válida:', supabaseKey.startsWith('eyJ'));

export const supabase = createClient(supabaseUrl, supabaseKey);
