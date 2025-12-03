// Ten plik jest używany podczas development (ng serve bez flagi --configuration)
export const environment = {
    supabaseUrl: process.env['SUPABASE_URL'] || '',
    supabaseKey: process.env['SUPABASE_KEY'] || '',
    openRouterApiKey: process.env['OPENROUTER_API_KEY'] || '',
};
