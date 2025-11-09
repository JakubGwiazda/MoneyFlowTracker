export const environment = {
  production: true,
  supabaseUrl: (import.meta as any).env?.['SUPABASE_URL'] || '',
  supabaseKey: (import.meta as any).env?.['SUPABASE_KEY'] || '',
  openRouterApiKey: (import.meta as any).env?.['OPENROUTER_API_KEY'] || '',
};
