import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ОШИБКА: Не найдены ключи Supabase. Проверь файл .env!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);