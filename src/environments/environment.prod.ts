// Ten plik jest używany w buildzie produkcyjnym (npm run build:prod)
// Klucze Supabase są publiczne (anon key) i bezpieczne do commitowania
export const environment = {
  production: true,
  supabaseUrl: 'https://bebnkqgtuemvscxdlvsq.supabase.co',
  supabaseKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYm5rcWd0dWVtdnNjeGRsdnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMDkwNDcsImV4cCI6MjA3ODg4NTA0N30.KjYA513AesZsXaXFZrHzGKh7DM0EF-fYGoWdyaZ_42U',
};
