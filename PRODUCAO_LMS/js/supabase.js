// js/supabase.js

// A sua URL única do projeto
const supabaseUrl = 'https://vifhmmpbfrfpndalxnan.supabase.co';

// COLE A SUA CHAVE PUBLISHABLE ABAIXO (Mantenha as aspas)
const supabaseKey = 'sb_publishable_9mQxR52ZImnCpx5V9aR_Og_JfkPr9mH'; 

// Inicia a conexão global
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);