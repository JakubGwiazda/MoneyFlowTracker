import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { environment } from '../environments/environment';

export const supabaseClient = createClient<Database>(environment.supabaseUrl, environment.supabaseKey);
