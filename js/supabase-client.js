/* =========================================================
   ساحة | Sahat — Supabase client
   Loaded (as a classic script, after the Supabase UMD bundle
   and before app.js) on every page so `sb` is available globally.
   ========================================================= */
const SUPABASE_URL = 'https://uijijqkbctemcfdzoxlg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fKElveNWpcfKrcC9GBjo4Q_48S5m2EK';

/* "تذكرني" — the session itself always lives in one place per browser, but
   WHICH storage backs it depends on a preference set at the moment of
   sign-in: localStorage survives closing the browser, sessionStorage clears
   when the tab/browser closes. Reads check both so an existing session is
   found regardless of which one holds it. */
const REMEMBER_PREF_KEY = 'sahat_remember_pref';
function getRememberPref(){ return localStorage.getItem(REMEMBER_PREF_KEY) !== '0'; }
function setRememberPref(remember){ localStorage.setItem(REMEMBER_PREF_KEY, remember ? '1' : '0'); }

const hybridAuthStorage = {
  getItem: key => sessionStorage.getItem(key) ?? localStorage.getItem(key),
  setItem: (key, value) => {
    if(getRememberPref()) localStorage.setItem(key, value);
    else sessionStorage.setItem(key, value);
  },
  removeItem: key => { localStorage.removeItem(key); sessionStorage.removeItem(key); },
};

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: hybridAuthStorage },
});
const MEDIA_BUCKET = 'sahat-media';
