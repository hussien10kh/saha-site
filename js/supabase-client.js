/* =========================================================
   ساحة | Sahat — Supabase client
   Loaded (as a classic script, after the Supabase UMD bundle
   and before app.js) on every page so `sb` is available globally.
   ========================================================= */
const SUPABASE_URL = 'https://uijijqkbctemcfdzoxlg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fKElveNWpcfKrcC9GBjo4Q_48S5m2EK';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MEDIA_BUCKET = 'sahat-media';
