/* =========================================================
   ساحة | Sahat — app.js
   Shared data + rendering helpers used across all pages.
   Ads, comments, favorites and accounts are persisted in a real
   Supabase (Postgres) backend — see supabase-client.js for the
   client and supabase_schema.sql for the schema/RLS. Visitor
   analytics, filter-usage tracking and the client-side error log
   remain in localStorage (per-browser diagnostics only, not real
   content, so a full backend isn't warranted for them yet).
   ========================================================= */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });

  /* Every deploy updates the service worker + cache fully automatically
     in the background (no button, no prompt) — the only thing a page
     genuinely can't do on its own is hot-swap its own already-running
     HTML/JS/CSS. So the one time we say anything is right after a new
     worker actually takes over an existing session: a small, dismissible
     notice offering a reload. Ignore it and just keep using the site or
     close the tab — next time you open it, everything is already current
     (and you land back on the same page, see restoreLastPage below). */
  const SW_SEEN_KEY = 'sahat_sw_seen';
  if (navigator.serviceWorker.controller) {
    localStorage.setItem(SW_SEEN_KEY, '1');
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (localStorage.getItem(SW_SEEN_KEY)) {
      showUpdateNotice();
    }
    localStorage.setItem(SW_SEEN_KEY, '1');
  });
}

function showUpdateNotice(){
  if (document.querySelector('.update-notice')) return;
  const el = document.createElement('div');
  el.className = 'update-notice';
  el.innerHTML = `
    <span>تم تحديث الموقع ✅ — أعد تحميل الصفحة للاستفادة من كل الميزات الجديدة</span>
    <button type="button" class="update-notice-reload">تحديث الآن</button>
    <button type="button" class="update-notice-close" aria-label="إغلاق">${ICONS.close}</button>
  `;
  document.body.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  el.querySelector('.update-notice-reload').addEventListener('click', ()=> location.reload());
  el.querySelector('.update-notice-close').addEventListener('click', ()=> el.remove());
}

/* ---------------------------------------------------------
   Last visited page — remembered for 3 days so opening the installed
   app (from the home-screen icon, i.e. actually launching the PWA
   rather than following a specific shared link) picks up where you
   left off instead of always restarting at the homepage.
   --------------------------------------------------------- */
const LAST_PAGE_KEY = 'sahat_last_page';
const LAST_PAGE_MAX_AGE = 3 * 24 * 60 * 60 * 1000;
const LAST_PAGE_EXCLUDED = ['login.html', 'admin.html', 'admin-login.html', 'reset-password.html', 'forgot-password.html'];

/* Captured before trackLastPage() below overwrites LAST_PAGE_KEY with the
   page currently loading — restoreLastPageIfLaunchedAsApp() needs the page
   from BEFORE this visit, not this visit itself. */
let PREVIOUS_LAST_PAGE = null;
try { PREVIOUS_LAST_PAGE = JSON.parse(localStorage.getItem(LAST_PAGE_KEY) || 'null'); } catch(e){}

function trackLastPage(){
  const page = location.pathname.split('/').pop() || 'index.html';
  if (LAST_PAGE_EXCLUDED.includes(page)) return;
  try {
    localStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ url: location.pathname + location.search, ts: Date.now() }));
  } catch(e){}
}
trackLastPage();

/* Called only from index.html — the PWA's start_url — since that's the
   one place a fresh app launch actually lands. */
function restoreLastPageIfLaunchedAsApp(){
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (!isStandalone) return;
  const saved = PREVIOUS_LAST_PAGE;
  if (!saved || Date.now() - saved.ts > LAST_PAGE_MAX_AGE) return;
  if (saved.url === location.pathname + location.search) return;
  location.replace(saved.url);
}

/* ---------------------------------------------------------
   PWA install button — shown in the header. On Android/Chrome
   it triggers the native install prompt; iOS Safari never fires
   beforeinstallprompt, so we show a one-time text hint instead
   since Apple only allows Share → Add to Home Screen there.
   --------------------------------------------------------- */
let deferredInstallPrompt = null;

function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandaloneApp(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/* Android browsers other than Chrome itself (Samsung Internet, Firefox,
   Edge, Opera...) each package the "install" step their own way — some,
   like Samsung Internet's own WebAPK generator, trip Play Protect with a
   scary "unsafe app" warning that has nothing to do with this site. Chrome's
   own install flow is the one that's actually smooth, so we nudge toward it
   rather than silently letting people hit that warning. */
function isAndroidNonChrome(){
  const ua = navigator.userAgent;
  if(!/Android/i.test(ua)) return false;
  const isOtherKnownBrowser = /SamsungBrowser|Firefox|OPR\/|Edg\//i.test(ua);
  const isRealChrome = /Chrome\//.test(ua) && !isOtherKnownBrowser;
  return !isRealChrome;
}

function syncInstallButtons(){
  const show = !isStandaloneApp() && (deferredInstallPrompt || isIOS());
  document.querySelectorAll('.install-app-btn').forEach(b => {
    b.style.display = show ? 'flex' : 'none';
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  syncInstallButtons();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  syncInstallButtons();
});

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.install-app-btn');
  if(!btn) return;
  if(deferredInstallPrompt){
    if(isAndroidNonChrome()){
      toast('يفضّل استخدام متصفح Chrome لتثبيت التطبيق لتجربة أسهل وأكثر استقراراً', null, 5000);
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    syncInstallButtons();
  } else if(isIOS()){
    toast('اضغط زر المشاركة ⬆ من الأسفل، ثم اختر "إضافة إلى الشاشة الرئيسية"', null, 5000);
  }
});

/* ---------------------------------------------------------
   Dark mode — follows the OS/browser preference automatically;
   the header toggle stores an explicit choice in localStorage
   that overrides the system preference from then on.
   --------------------------------------------------------- */
function getStoredTheme(){
  try { return localStorage.getItem('theme'); } catch(e){ return null; }
}

function getEffectiveTheme(){
  const stored = getStoredTheme();
  if(stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeToggleIcon(){
  const effective = getEffectiveTheme();
  document.querySelectorAll('.theme-toggle-btn').forEach(b => {
    b.innerHTML = effective === 'dark' ? ICONS.sun : ICONS.moon;
  });
}

function applyTheme(theme){
  if(theme === 'light' || theme === 'dark'){
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  updateThemeToggleIcon();
}

function toggleTheme(){
  const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', next); } catch(e){}
  applyTheme(next);
}

document.addEventListener('click', (e) => {
  if(e.target.closest('.theme-toggle-btn')) toggleTheme();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if(!getStoredTheme()) updateThemeToggleIcon();
});

const ICONS = {
  home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>`,
  building:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></svg>`,
  car:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11 6.5 6h11L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>`,
  grid:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  pin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  chevron:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>`,
  eye:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  heart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.7-10-9.3C.4 8 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.2 4 3.6 7.7C16.5 16.3 12 21 12 21Z"/></svg>`,
  phone:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2C9.5 22 2 14.5 2 6a2 2 0 0 1 2-2Z"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  menu:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
  close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>`,
  warning:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.9 18.5a1.7 1.7 0 0 0 1.5 2.6h17.2a1.7 1.7 0 0 0 1.5-2.6L13.7 3.9a1.7 1.7 0 0 0-3.4 0Z"/></svg>`,
  upload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>`,
  download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>`,
  device:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>`,
  fb:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.9.2-1.5 1.6-1.5h1.6V4.3C15.9 4.2 14.9 4 13.8 4c-2.4 0-4 1.5-4 4.1v2.3H7.2v3h2.6V21h3.7Z"/></svg>`,
  ig:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg>`,
  tw:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4.2 4.2 0 0 1-1.9.1 4.1 4.1 0 0 0 3.8 2.9A8.3 8.3 0 0 1 2 18.4a11.6 11.6 0 0 0 6.3 1.9c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.2Z"/></svg>`,
  wa:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.6-1.2-1.4-1.4-1.6-.1-.2 0-.4.1-.5l.4-.4.2-.4c.1-.1 0-.3 0-.4L9 8.2c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z"/></svg>`,
  mail:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 6.5 8 6 8-6"/></svg>`,
  tg:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 4.5 2.7 11.8c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14c.3-1.2-.4-1.7-1.4-1.3ZM8.2 14.4l9.5-6c.4-.3.8 0 .5.4l-8 7.5-.3 3.2-1.4-4.5Z"/></svg>`,
  link:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5"/></svg>`,
  share:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9"/></svg>`,
  bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 5.5 2 7.5 2 7.5H4S6 13.5 6 8Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>`,
  sun:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`,
};

const CATEGORY_LABELS = {realestate:'عقار', cars:'سيارات', misc:'غير مصنف'};

/* Local placeholder shown when an ad has no photo yet (no external
   network dependency, and doubles as the "no image" state). */
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
  <rect width="900" height="600" fill="#eef0f4"/>
  <g fill="none" stroke="#b9c0cf" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <rect x="220" y="180" width="460" height="300" rx="16"/>
    <circle cx="340" cy="270" r="35"/>
    <path d="M220 430 L390 300 L520 400 L620 320 L680 380 L680 460 L220 460 Z"/>
  </g>
  <text x="450" y="530" text-anchor="middle" font-family="Cairo, Tajawal, Arial, sans-serif" font-size="30" font-weight="900" fill="#b9c0cf">ساحة</text>
</svg>`);

const CITY_GROUPS = [
  { governorate: 'دمشق', cities: ['دمشق'] },
  { governorate: 'ريف دمشق', cities: ['دوما','حرستا','التل','قدسيا','الزبداني','النبك','يبرود','قطنا','دير عطية','صحنايا'] },
  { governorate: 'حلب', cities: ['حلب','منبج','الباب','عفرين','أعزاز','جرابلس','السفيرة'] },
  { governorate: 'حمص', cities: ['حمص','تدمر','القصير','الرستن','تلكلخ'] },
  { governorate: 'حماة', cities: ['حماة','السلمية','مصياف','محردة','صوران'] },
  { governorate: 'اللاذقية', cities: ['اللاذقية','جبلة','القرداحة','الحفة'] },
  { governorate: 'طرطوس', cities: ['طرطوس','بانياس','صافيتا','دريكيش','الشيخ بدر'] },
  { governorate: 'درعا', cities: ['درعا','إزرع','الصنمين','نوى','بصرى الشام','جاسم'] },
  { governorate: 'السويداء', cities: ['السويداء','شهبا','صلخد','عريقة'] },
  { governorate: 'دير الزور', cities: ['دير الزور','الميادين','البوكمال','الشحيل'] },
  { governorate: 'الحسكة', cities: ['الحسكة','القامشلي','رأس العين','المالكية','تل تمر'] },
  { governorate: 'الرقة', cities: ['الرقة','تل أبيض','الطبقة','معدان'] },
  { governorate: 'إدلب', cities: ['إدلب','معرة النعمان','جسر الشغور','أريحا','سراقب'] },
  { governorate: 'القنيطرة', cities: ['القنيطرة','خان أرنبة','مسعدة'] },
];
const CITIES = CITY_GROUPS.flatMap(g => g.cities);

const AD_EXPIRY_DAYS = 90;

/* ---------------------------------------------------------
   Time / relative-date helpers — computed live from real
   `created_at` timestamps instead of a static stored string.
   --------------------------------------------------------- */
function timeAgo(dateInput){
  const then = new Date(dateInput).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now()-then)/1000));
  if(diffSec < 60) return 'الآن';
  const mins = Math.floor(diffSec/60);
  if(mins < 60) return `منذ ${mins} ${mins===1?'دقيقة':'دقائق'}`;
  const hours = Math.floor(mins/60);
  if(hours < 24) return `منذ ${hours} ${hours===1?'ساعة':'ساعات'}`;
  const days = Math.floor(hours/24);
  if(days < 30) return `منذ ${days} ${days===1?'يوم':'أيام'}`;
  const months = Math.floor(days/30);
  if(months < 12) return `منذ ${months} ${months===1?'شهر':'أشهر'}`;
  const years = Math.floor(months/12);
  return `منذ ${years} ${years===1?'سنة':'سنوات'}`;
}
function isRecent(dateInput){
  return Date.now() - new Date(dateInput).getTime() < 48*60*60*1000;
}
const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function memberSinceLabel(dateInput){
  if(!dateInput) return '';
  const d = new Date(dateInput);
  return `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function isExpired(ad){
  return Date.now() - new Date(ad.createdAt).getTime() > AD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

/* ---------------------------------------------------------
   Row <-> app-object mapping (Supabase uses snake_case columns,
   the rest of the site keeps the original camelCase ad shape).
   --------------------------------------------------------- */
function mapAdRow(row){
  if(!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    category: row.category,
    title: row.title,
    description: row.description,
    price: row.price,
    city: row.city,
    images: (row.images && row.images.length) ? row.images : [PLACEHOLDER_IMG],
    seller: row.seller_name,
    phone: row.phone,
    contactMethod: row.contact_method,
    views: row.views || 0,
    createdAt: row.created_at,
    postedAgo: timeAgo(row.created_at),
    isNew: isRecent(row.created_at),
    memberSince: row.profiles ? memberSinceLabel(row.profiles.created_at) : '',
  };
}
function adFieldsToRow(fields){
  const map = {
    category:'category', title:'title', description:'description', price:'price', city:'city',
    images:'images', seller:'seller_name', phone:'phone', contactMethod:'contact_method',
    views:'views', ownerId:'owner_id', createdAt:'created_at',
  };
  const row = {};
  Object.keys(fields).forEach(k=>{ if(map[k]) row[map[k]] = fields[k]; });
  return row;
}

/* ---------------------------------------------------------
   Ads
   --------------------------------------------------------- */
async function getActiveAds(){
  const cutoff = new Date(Date.now() - AD_EXPIRY_DAYS*24*60*60*1000).toISOString();
  const { data, error } = await sb.from('ads').select('*').gte('created_at', cutoff).order('created_at', {ascending:false});
  if(error){ console.error(error); return []; }
  return data.map(mapAdRow);
}
async function getAdsByOwner(ownerId){
  const { data, error } = await sb.from('ads').select('*, profiles!ads_owner_id_fkey(created_at)').eq('owner_id', ownerId).order('created_at', {ascending:false});
  if(error){ console.error(error); return []; }
  return data.map(mapAdRow);
}
async function getAdById(id){
  if(!id) return null;
  const { data, error } = await sb.from('ads').select('*, profiles!ads_owner_id_fkey(created_at)').eq('id', id).maybeSingle();
  if(error || !data) return null;
  return mapAdRow(data);
}
async function addAd(fields){
  const { data, error } = await sb.from('ads').insert(adFieldsToRow(fields)).select('*').single();
  if(error) throw error;
  return mapAdRow(data);
}
async function updateAd(id, patch){
  const { data, error } = await sb.from('ads').update(adFieldsToRow(patch)).eq('id', id).select('*').single();
  if(error) throw error;
  return mapAdRow(data);
}
async function deleteAd(id){
  const { error } = await sb.from('ads').delete().eq('id', id);
  if(error) throw error;
}
async function renewAd(id){
  await updateAd(id, { createdAt: new Date().toISOString() });
  markExpiryWarningSeen(id, false); // a freshly renewed ad can warn again once it nears expiry next time
}
async function trackAdView(adId){
  try{
    const seenKey = 'sahat_seen_' + adId;
    if(sessionStorage.getItem(seenKey)) return; // count once per session per ad
    sessionStorage.setItem(seenKey, '1');
    await sb.rpc('increment_ad_views', { ad_id: adId });
  }catch(e){}
}

/* Ranks by real engagement (views + a heavier weight for comments, since a
   comment signals stronger interest than a passive view). commentCounts is
   a { adId: count } map fetched once per page via getCommentCounts(). */
function engagementScore(ad, commentCounts){
  return (ad.views||0) + ((commentCounts && commentCounts[ad.id]) || 0) * 3;
}
async function getSimilarAds(ad){
  const [ads, commentCounts] = await Promise.all([getActiveAds(), getCommentCounts()]);
  return ads
    .filter(a=>a.category===ad.category && a.id!==ad.id)
    .sort((a,b)=>{
      const sameCityA = a.city===ad.city ? 1 : 0;
      const sameCityB = b.city===ad.city ? 1 : 0;
      if(sameCityB !== sameCityA) return sameCityB - sameCityA;
      return engagementScore(b, commentCounts) - engagementScore(a, commentCounts);
    })
    .slice(0,4);
}

/* ---------------------------------------------------------
   Comments
   --------------------------------------------------------- */
async function getComments(adId){
  const { data, error } = await sb.from('comments').select('*').eq('ad_id', adId).order('created_at', {ascending:true});
  if(error) return [];
  return data.map(c=>({ id:c.id, name:c.name, text:c.text, time: timeAgo(c.created_at) }));
}
async function saveComment(adId, c){
  const user = await getCurrentUser();
  if(!user) throw new Error('login required');
  const { error } = await sb.from('comments').insert({ ad_id:adId, user_id:user.id, name:c.name, text:c.text });
  if(error) throw error;
}
async function deleteComment(commentId){
  const { error } = await sb.from('comments').delete().eq('id', commentId);
  if(error) throw error;
}
async function getAllCommentsFlat(){
  const { data, error } = await sb.from('comments').select('*, ads(title)').order('created_at', {ascending:false});
  if(error) return [];
  return data.map(c=>({ id:c.id, adId:c.ad_id, adTitle: (c.ads && c.ads.title) || '', name:c.name, text:c.text, time: timeAgo(c.created_at) }));
}
async function getCommentCounts(){
  const { data, error } = await sb.from('comments').select('ad_id');
  if(error) return {};
  const map = {};
  data.forEach(r=>{ map[r.ad_id] = (map[r.ad_id]||0) + 1; });
  return map;
}

/* ---------------------------------------------------------
   Notifications — only truly NEW items count: a comment count the
   advertiser hasn't seen yet, or an expiry warning not yet acknowledged.
   Opening the notifications panel marks everything shown as seen.
   The "seen" bookkeeping itself stays per-browser (localStorage) since
   it's just a read/unread UI flag, not real content.
   --------------------------------------------------------- */
function getSeenCommentsCount(adId){
  return Number(localStorage.getItem('sahat_seen_comments_'+adId) || 0);
}
function markCommentsSeen(adId, count){
  localStorage.setItem('sahat_seen_comments_'+adId, String(count));
}
function isExpiryWarningSeen(adId){
  return localStorage.getItem('sahat_seen_expiry_'+adId) === '1';
}
function markExpiryWarningSeen(adId, seen){
  if(seen===false) localStorage.removeItem('sahat_seen_expiry_'+adId);
  else localStorage.setItem('sahat_seen_expiry_'+adId, '1');
}

async function getUserNotifications(){
  const user = await getCurrentUser();
  if(!user) return [];
  const notes = [];
  const dayMs = 24*60*60*1000;
  const warnWindow = 7*dayMs;
  const totalLifeMs = AD_EXPIRY_DAYS*dayMs;
  const [ads, commentCounts] = await Promise.all([getAdsByOwner(user.id), getCommentCounts()]);
  ads.forEach(ad=>{
    const age = Date.now() - new Date(ad.createdAt).getTime();
    if(!isExpired(ad) && (totalLifeMs - age) <= warnWindow && !isExpiryWarningSeen(ad.id)){
      notes.push({ type:'expiring', adId:ad.id, text:`إعلانك "${ad.title}" سينتهي قريباً — جدّد نشره من صفحة حسابي.` });
    }
    const commentsCount = commentCounts[ad.id] || 0;
    const seenCount = getSeenCommentsCount(ad.id);
    if(commentsCount > seenCount){
      const newCount = commentsCount - seenCount;
      notes.push({ type:'comments', adId:ad.id, count:commentsCount, text:`لديك ${newCount} ${newCount===1?'تعليق جديد':'تعليقات جديدة'} على إعلانك "${ad.title}".` });
    }
  });
  return notes;
}
function markNotificationsSeen(notes){
  notes.forEach(n=>{
    if(n.type==='expiring') markExpiryWarningSeen(n.adId, true);
    if(n.type==='comments') markCommentsSeen(n.adId, n.count);
  });
}

/* ---------------------------------------------------------
   Auth — real Supabase accounts (email+password, or an
   anonymous "guest" session) instead of the old localStorage
   fake-login. A `profiles` row (name/phone/avatar/is_admin)
   exists for every account, created automatically by a DB
   trigger the moment the auth user is created.
   --------------------------------------------------------- */
/* Falls back to the part before "@" (never the raw email) so a name never
   silently ends up looking like an email address anywhere on the site. */
function emailPrefix(email){ return email ? email.split('@')[0] : ''; }

async function getCurrentUser(){
  const { data: { session } } = await sb.auth.getSession();
  if(!session) return null;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  return {
    id: session.user.id,
    email: session.user.email || null,
    name: (profile && profile.name) || emailPrefix(session.user.email) || 'مستخدم',
    phone: profile ? profile.phone : null,
    avatar: profile ? profile.avatar_url : null,
    isAdmin: !!(profile && profile.is_admin),
    isAnonymous: !!session.user.is_anonymous,
  };
}
async function isLoggedIn(){ return !!(await getCurrentUser()); }

async function signUpWithEmail(email, password, name){
  const { data, error } = await sb.auth.signUp({ email, password });
  if(error) throw error;
  if(data.user) await sb.from('profiles').update({ name }).eq('id', data.user.id);
  return data;
}
async function signInWithEmail(email, password){
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error) throw error;
  return data;
}
async function sendPasswordReset(email){
  const redirectTo = new URL('reset-password.html', location.href).href;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if(error) throw error;
}
async function signInAsGuest(name, phone){
  const { data, error } = await sb.auth.signInAnonymously();
  if(error) throw error;
  if(data.user) await sb.from('profiles').update({ name, phone }).eq('id', data.user.id);
  return data;
}
async function updateProfile(patch){
  const user = await getCurrentUser();
  if(!user) throw new Error('login required');
  const row = {};
  if(patch.name !== undefined) row.name = patch.name;
  if(patch.phone !== undefined) row.phone = patch.phone;
  if(patch.avatar !== undefined) row.avatar_url = patch.avatar;
  await sb.from('profiles').update(row).eq('id', user.id);
}
async function logout(){ await sb.auth.signOut(); }

/* "أضف إعلانك" always opens the form directly — no login wall up front.
   The form itself only asks the visitor to sign in (or continue as a
   guest) at the moment they actually try to publish. */
function addAdHref(){
  return 'add-ad.html';
}
/* "تسجيل الدخول" turns into "حسابي" everywhere once a session exists. */
async function authLinkHTML(){
  return (await isLoggedIn())
    ? { href:'account.html', label:'حسابي' }
    : { href:'login.html', label:'تسجيل الدخول' };
}

/* ---------------------------------------------------------
   Admin dashboard — a real Supabase account (email+password)
   flagged with profiles.is_admin = true. RLS on the ads/comments
   tables checks this same flag server-side, so admin write access
   is enforced by the database, not just by hiding UI on the client.
   --------------------------------------------------------- */
async function adminLogin(email, password){
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error) return false;
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', data.user.id).maybeSingle();
  if(!profile || !profile.is_admin){ await sb.auth.signOut(); return false; }
  return true;
}
async function isAdminLoggedIn(){
  const user = await getCurrentUser();
  return !!(user && user.isAdmin);
}
async function adminLogout(){ await logout(); }
async function requireAdmin(){
  if(!(await isAdminLoggedIn())){ location.href = 'admin-login.html'; return false; }
  return true;
}
/* Generic — works for any signed-in account (admin or regular user), since
   it's just Supabase Auth's own updateUser under the hood. */
async function updateAccountPassword(newPassword){
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if(error) throw error;
}
async function updateAccountEmail(newEmail){
  const { error } = await sb.auth.updateUser({ email: newEmail });
  if(error) throw error;
}

/* ---------------------------------------------------------
   Favorites — cached in memory per page load (CURRENT_FAVORITES)
   so isFavorite() can stay a plain synchronous helper for template
   strings; call loadFavorites() once before rendering any ad cards.
   --------------------------------------------------------- */
let CURRENT_FAVORITES = new Set();
async function loadFavorites(){
  const user = await getCurrentUser();
  if(!user){ CURRENT_FAVORITES = new Set(); return; }
  const { data } = await sb.from('favorites').select('ad_id').eq('user_id', user.id);
  CURRENT_FAVORITES = new Set((data||[]).map(r=>r.ad_id));
}
function isFavorite(id){ return CURRENT_FAVORITES.has(id); }
async function toggleFavorite(id){
  const user = await getCurrentUser();
  if(!user){ toast('سجّل الدخول لحفظ المفضلة'); return CURRENT_FAVORITES.has(id); }
  if(CURRENT_FAVORITES.has(id)){
    const { error } = await sb.from('favorites').delete().eq('user_id', user.id).eq('ad_id', id);
    if(error) throw error;
    CURRENT_FAVORITES.delete(id);
  } else {
    const { error } = await sb.from('favorites').insert({ user_id:user.id, ad_id:id });
    if(error) throw error;
    CURRENT_FAVORITES.add(id);
  }
  return CURRENT_FAVORITES.has(id);
}
async function getFavoriteAds(){
  const user = await getCurrentUser();
  if(!user) return [];
  const { data, error } = await sb.from('favorites').select('created_at, ads(*, profiles!ads_owner_id_fkey(created_at))').eq('user_id', user.id).order('created_at', {ascending:false});
  if(error) return [];
  return data.map(r=> mapAdRow(r.ads)).filter(Boolean);
}

/* ---------------------------------------------------------
   Media (Supabase Storage) — ad photos and the profile avatar are
   uploaded here and referenced by public URL, instead of being
   stored inline as base64 (fine for a browser-only demo, but a
   real Postgres table shouldn't carry megabytes per row).
   --------------------------------------------------------- */
function randomId(){ return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10); }

/* Turns an ad title into a readable, URL-safe filename fragment —
   keeps the Arabic (or whatever script) as-is, just strips characters
   that break storage keys/URLs and collapses whitespace to hyphens. */
function slugifyTitle(title){
  return (title || 'ad')
    .trim()
    .replace(/[\/\\?%*:|"<>#،؛؟!]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'ad';
}

async function uploadMedia(blob, path, contentType){
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType, upsert:true });
  if(error) throw error;
  const { data } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
/* Uploads any base64 data: URLs in `images` to Storage and returns the
   final URL list; anything that's already a real URL (e.g. untouched
   photos on an ad being edited) is passed through unchanged. Filenames
   are derived from the ad title (readable + good for SEO), with a
   short random suffix so two ads with the same title never collide. */
async function uploadAdImages(images, ownerId, title){
  const out = [];
  const slug = slugifyTitle(title);
  const suffix = Math.random().toString(36).slice(2,6);
  let i = 0;
  for(const img of images){
    i++;
    if(!img || img===PLACEHOLDER_IMG || !img.startsWith('data:')){ out.push(img); continue; }
    const blob = await (await fetch(img)).blob();
    const path = `${ownerId}/ads/${slug}-${i}-${suffix}.webp`;
    out.push(await uploadMedia(blob, path, 'image/webp'));
  }
  return out;
}

/* ---------------------------------------------------------
   Safe rendering — escape any user-typed text before it goes into
   innerHTML, so a pasted link or stray markup can never become a real
   clickable/executable element, only plain visible text.
   --------------------------------------------------------- */
function escapeHTML(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[c]));
}

/* ---------------------------------------------------------
   Lightweight, client-side spam/gibberish checks — not a substitute for
   real server-side moderation, but catches the obvious cases: keyboard
   mashing, repeated characters, posting too fast, or duplicating an
   existing ad word-for-word.
   --------------------------------------------------------- */
function looksLikeGibberish(text){
  const t = (text || '').trim();
  if(!t) return true;
  if(t.length > 14 && !t.includes(' ')) return true; // one long blob, no spaces
  if(/(.)\1{4,}/.test(t)) return true;                // same char 5+ times in a row
  if(/(.{2,4})\1{3,}/.test(t)) return true;            // short pattern repeated 4+ times
  return false;
}

async function isDuplicateAd(title, description, excludeId){
  const norm = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const { data, error } = await sb.from('ads').select('id,title,description').ilike('title', (title||'').trim());
  if(error || !data) return false;
  return data.some(a =>
    a.id !== excludeId &&
    norm(a.title) === norm(title) &&
    norm(a.description) === norm(description)
  );
}

/* Blocks posting more than 3 new ads within a 10-minute window per browser.
   Read-only check — only recordSuccessfulPost() below actually spends one
   of the 3 slots, so failed/retried attempts (network errors, etc.) don't
   count against a genuine spammer's limit. */
const POSTING_LIMIT_KEY = 'sahat_recent_posts', POSTING_LIMIT_WINDOW_MS = 10 * 60 * 1000, POSTING_LIMIT_MAX = 3;

function isPostingTooFast(){
  const now = Date.now();
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(POSTING_LIMIT_KEY) || '[]'); }catch(e){}
  list = list.filter(ts => now - ts < POSTING_LIMIT_WINDOW_MS);
  localStorage.setItem(POSTING_LIMIT_KEY, JSON.stringify(list));
  return list.length >= POSTING_LIMIT_MAX;
}

function recordSuccessfulPost(){
  const now = Date.now();
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(POSTING_LIMIT_KEY) || '[]'); }catch(e){}
  list = list.filter(ts => now - ts < POSTING_LIMIT_WINDOW_MS);
  list.push(now);
  localStorage.setItem(POSTING_LIMIT_KEY, JSON.stringify(list));
}

/* ---------------------------------------------------------
   Formatting
   --------------------------------------------------------- */
function formatPrice(n){
  if(n===null || n===undefined || n==='') return 'السعر عند التواصل';
  return Number(n).toLocaleString('en-US')+' ل.س';
}

/* Some phone keyboards (Arabic/Persian digit layouts) type ٠١٢٣.../۰۱۲۳...
   instead of 0123... — convert those to plain ASCII digits and drop
   anything else, so every phone number stored/shown/dialed is consistent
   regardless of what keyboard the person typed it on. */
function toAsciiDigits(v){
  if(!v) return '';
  const map = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  };
  return v.replace(/[٠-٩۰-۹]/g, d => map[d]).replace(/\D/g, '');
}
function normalizePhone(v){ return toAsciiDigits(v); }

/* Converts a local Syrian mobile number (e.g. "0999 123 456") to the
   international digits-only format WhatsApp deep links require. */
function toWhatsAppDigits(phone){
  let digits = normalizePhone(phone);
  if(!digits) return '';
  if(digits.startsWith('0')) digits = '963' + digits.slice(1);
  else if(!digits.startsWith('963')) digits = '963' + digits;
  return digits;
}
function initials(name){ return (name||'؟').trim().charAt(0); }

/* ---------------------------------------------------------
   Toast
   --------------------------------------------------------- */
function toast(msg, type, duration){
  let el = document.querySelector('.toast');
  if(!el){
    el = document.createElement('div');
    el.className='toast';
    document.body.appendChild(el);
  }
  const isError = type === 'error';
  el.classList.toggle('toast-error', isError);
  el.innerHTML = (isError ? ICONS.warning : ICONS.check) + '<span>'+escapeHTML(msg)+'</span>';
  requestAnimationFrame(()=> el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove('show'), duration || (isError ? 4000 : 2600));
}

/* ---------------------------------------------------------
   Header / Footer / Mobile nav
   --------------------------------------------------------- */
async function renderHeader(activeCategory){
  const mount = document.getElementById('site-header');
  if(!mount) return;
  const auth = await authLinkHTML();
  const notes = await getUserNotifications();
  mount.innerHTML = `
  <header class="site-header">
    <div class="container">
      <div class="header-top">
        <a class="logo" href="index.html">ساحة</a>
        <div class="header-actions">
          <button class="theme-toggle-btn" id="themeToggleBtn" type="button" aria-label="تبديل الوضع الليلي"></button>
          <a class="btn btn-outline cta-add" href="${addAdHref()}">أضف إعلانك</a>
          ${notes.length ? `
          <div class="header-bell-wrap">
            <button class="header-bell-btn" id="headerBellBtn" type="button" aria-label="إشعارات">
              ${ICONS.bell}<span class="header-bell-badge"></span>
            </button>
            <div class="header-bell-dropdown" id="headerBellDropdown">
              ${notes.map(n=>`<a href="listing.html?id=${n.adId}">${escapeHTML(n.text)}</a>`).join('')}
            </div>
          </div>` : ''}
          <a class="btn btn-primary cta-auth" href="${auth.href}">${auth.label}</a>
          <div class="hamburger-wrap">
            <button class="hamburger" id="hamburgerBtn" aria-label="القائمة">${ICONS.menu}</button>
            <div class="hamburger-dropdown" id="hamburgerDropdown">
              <a data-cat="" href="index.html">${ICONS.home}<span>الرئيسية</span></a>
              <a data-cat="realestate" href="index.html?cat=realestate">${ICONS.building}<span>عقار</span></a>
              <a data-cat="cars" href="index.html?cat=cars">${ICONS.car}<span>سيارات</span></a>
              <a data-cat="misc" href="index.html?cat=misc">${ICONS.grid}<span>غير مصنف</span></a>
            </div>
          </div>
        </div>
      </div>
      <form class="search-bar" id="searchForm">
        <div class="search-city" id="cityBtn">
          ${ICONS.pin}<span class="city-label" id="cityLabel">كل المدن</span>${ICONS.chevron}
          <div class="city-dropdown" id="cityDropdown"></div>
        </div>
        <input type="text" id="searchInput" placeholder="أكتب ما تبحث عنه....">
        <button type="submit" class="search-submit">${ICONS.search}<span>بحث</span></button>
      </form>
      <nav class="tabs" id="tabsNav">
        <a class="tab" data-cat="" href="index.html">${ICONS.home}<span>الرئيسية</span></a>
        <a class="tab" data-cat="realestate" href="index.html?cat=realestate">${ICONS.building}<span>عقار</span></a>
        <a class="tab" data-cat="cars" href="index.html?cat=cars">${ICONS.car}<span>سيارات</span></a>
        <a class="tab" data-cat="misc" href="index.html?cat=misc">${ICONS.grid}<span>غير مصنف</span></a>
      </nav>
    </div>
  </header>`;

  mount.querySelectorAll('.tab, .hamburger-dropdown a').forEach(t=>{
    if((t.dataset.cat||'')===(activeCategory||'')) t.classList.add('active');
  });

  syncInstallButtons();
  updateThemeToggleIcon();

  const hamb = document.getElementById('hamburgerBtn');
  const hambDropdown = document.getElementById('hamburgerDropdown');
  if(hamb && hambDropdown){
    hamb.addEventListener('click', e=>{
      e.stopPropagation();
      hambDropdown.classList.toggle('open');
    });
    hambDropdown.addEventListener('click', e=>{
      if(e.target.closest('a')) hambDropdown.classList.remove('open');
    });
    document.addEventListener('click', ()=> hambDropdown.classList.remove('open'));
  }

  const bellBtn = document.getElementById('headerBellBtn');
  const bellDropdown = document.getElementById('headerBellDropdown');
  if(bellBtn && bellDropdown){
    bellBtn.addEventListener('click', e=>{
      e.stopPropagation();
      bellDropdown.classList.toggle('open');
      if(bellDropdown.classList.contains('open')){
        markNotificationsSeen(notes);
        const badge = bellBtn.querySelector('.header-bell-badge');
        if(badge) badge.remove();
      }
    });
    bellDropdown.addEventListener('click', e=> e.stopPropagation());
    document.addEventListener('click', ()=> bellDropdown.classList.remove('open'));
  }

  const cityBtn = document.getElementById('cityBtn');
  const cityDropdown = document.getElementById('cityDropdown');
  let selectedCity = new URLSearchParams(location.search).get('city') || '';
  if(cityBtn && cityDropdown){
    cityDropdown.innerHTML = `<button type="button" data-city="كل المدن">كل المدن</button>` +
      CITY_GROUPS.map(g => `
        <div class="city-group">
          <div class="city-group-title">${g.governorate}</div>
          ${g.cities.map(c=>`<button type="button" data-city="${c}">${c}</button>`).join('')}
        </div>`).join('');
    if(selectedCity) document.getElementById('cityLabel').textContent = selectedCity;
    cityBtn.addEventListener('click', e=>{
      e.stopPropagation();
      cityDropdown.classList.toggle('open');
    });
    cityDropdown.addEventListener('click', e=>{
      const b = e.target.closest('button');
      if(!b) return;
      selectedCity = b.dataset.city==='كل المدن' ? '' : b.dataset.city;
      document.getElementById('cityLabel').textContent = b.dataset.city;
      cityDropdown.classList.remove('open');
    });
    document.addEventListener('click', ()=> cityDropdown.classList.remove('open'));
  }

  const searchForm = document.getElementById('searchForm');
  if(searchForm){
    searchForm.addEventListener('submit', e=>{
      e.preventDefault();
      const q = document.getElementById('searchInput').value.trim();
      const url = new URL('index.html', location.href);
      if(q) url.searchParams.set('q', q);
      if(activeCategory) url.searchParams.set('cat', activeCategory);
      if(selectedCity) url.searchParams.set('city', selectedCity);
      location.href = url.pathname + url.search;
    });
  }
}

async function renderFooter(){
  const mount = document.getElementById('site-footer');
  if(!mount) return;
  const auth = await authLinkHTML();
  mount.innerHTML = `
  <footer class="site-footer">
    <div class="container footer-top">
      <div class="footer-logo">ساحة</div>
      <div class="footer-columns-row">
        <div class="footer-col">
          <h4>الدعم</h4>
          <ul>
            <li><a href="faq.html">الأسئلة الشائعة</a></li>
            <li><a href="privacy.html">سياسة الخصوصية</a></li>
            <li><a href="terms.html">شروط الاستخدام</a></li>
            <li><a href="contact.html">الإبلاغ عن مشكلة</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>روابط سريعة</h4>
          <ul>
            <li><a href="${addAdHref()}">أضف إعلانك</a></li>
            <li><a href="${auth.href}">${auth.label}</a></li>
            <li><a href="about.html">عن ساحة</a></li>
            <li><a href="contact.html">تواصل معنا</a></li>
          </ul>
        </div>
        <div class="footer-col footer-categories-col">
          <h4>التصنيفات</h4>
          <ul>
            <li><a href="index.html?cat=realestate">عقار</a></li>
            <li><a href="index.html?cat=cars">سيارات</a></li>
            <li><a href="index.html?cat=misc">غير مصنف</a></li>
          </ul>
        </div>
        <div class="footer-app-promo">
          <div class="footer-app-text">
            <strong>حمّل تطبيق ساحة</strong>
            <span>تجربة أسرع وإشعارات فورية</span>
          </div>
          <button type="button" class="btn btn-primary footer-app-btn install-app-btn" style="display:none">${ICONS.download}<span>تثبيت التطبيق</span></button>
        </div>
        <div class="social-row">
          <a href="https://www.facebook.com/saahasyria" target="_blank" rel="noopener" aria-label="فيسبوك">${ICONS.fb}</a>
          <a href="https://www.instagram.com/saahasyria/" target="_blank" rel="noopener" aria-label="إنستغرام">${ICONS.ig}</a>
          <a href="https://x.com/saahasyria" target="_blank" rel="noopener" aria-label="تويتر">${ICONS.tw}</a>
          <a href="contact.html" aria-label="تواصل معنا">${ICONS.mail}</a>
        </div>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© ${new Date().getFullYear()} ساحة. جميع الحقوق محفوظة.</span>
    </div>
  </footer>`;
  syncInstallButtons();
}

/* Builds the bottom nav bar's outline as a real SVG path with a round,
   smooth dip cut into its top edge for the "+" fab to sit in — both bezier
   control points on each side share the Y of their endpoint (C1 at y=0
   like the flat line, C2 at y=depth like the bottom point), so the tangent
   stays horizontal at every join (flat-to-curve and curve-to-curve), giving
   a continuous, kink-free curve. Finalized against site/demo-notch.html. */
function mnavNotchPath(width, height, notchHalfWidth, notchDepth, cornerRadius){
  const cx = width / 2;
  const R = notchHalfWidth;
  const depth = notchDepth;
  const m = R * 0.62;
  return `
    M${cornerRadius},0
    H${cx - R}
    C${cx - R + m},0 ${cx - m},${depth} ${cx},${depth}
    C${cx + m},${depth} ${cx + R - m},0 ${cx + R},0
    H${width - cornerRadius}
    Q${width},0 ${width},${cornerRadius}
    V${height - cornerRadius}
    Q${width},${height} ${width - cornerRadius},${height}
    H${cornerRadius}
    Q0,${height} 0,${height - cornerRadius}
    V${cornerRadius}
    Q0,0 ${cornerRadius},0
    Z
  `;
}
function renderMnavNotch(navEl){
  const svg = navEl.querySelector('#mnavSvg');
  const path = navEl.querySelector('#mnavPath');
  if(!svg || !path) return;
  const w = navEl.clientWidth, h = navEl.clientHeight;
  if(!w || !h) return;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  path.setAttribute('d', mnavNotchPath(w, h, 56, 32, h/2));
}

async function renderMobileNav(active){
  const mount = document.getElementById('mobile-nav');
  if(!mount) return;
  const loggedIn = await isLoggedIn();
  const accountHref = loggedIn ? 'account.html' : ('login.html?redirect=' + encodeURIComponent('account.html'));
  const accountLabel = loggedIn ? 'حسابي' : 'دخول';
  const notes = await getUserNotifications();

  let badgeOn = notes.length > 0;

  mount.innerHTML = `
  <nav class="mobile-nav mnav-hidden">
    <svg class="mnav-svg" id="mnavSvg" preserveAspectRatio="none"><path id="mnavPath"></path></svg>
    <div class="mnav-items">
      <a href="index.html" class="${active==='home'?'active':''}">${ICONS.home}<span>الرئيسية</span></a>
      <button type="button" class="mnav-icon-btn" id="mnavSearchBtn">${ICONS.search}<span>بحث</span></button>
      <div></div>
      <button type="button" class="mnav-icon-btn" id="mnavAlertsBtn">
        ${ICONS.bell}${badgeOn ? '<span class="mnav-badge"></span>' : ''}
        <span>إشعارات</span>
      </button>
      <a href="${accountHref}" class="${active==='account'?'active':''}">${ICONS.user}<span>${accountLabel}</span></a>
    </div>
    <a href="${addAdHref()}" class="fab">${ICONS.plus}</a>
  </nav>
  <div class="mnav-popup" id="mnavSearchBox">
    <form id="mnavSearchForm" style="display:flex;gap:8px;">
      <input type="text" id="mnavSearchInput" placeholder="ابحث في ساحة..." style="flex:1;border:1.5px solid var(--border);border-radius:10px;padding:10px 14px;font-size:14px;">
      <button type="submit" class="btn btn-primary" style="padding:10px 16px;"><span class="mnav-search-submit-icon">${ICONS.search}</span></button>
    </form>
  </div>
  <div class="mnav-popup" id="mnavAlertsPanel">
    ${notes.length
      ? `<div style="display:flex;flex-direction:column;gap:10px;">${notes.map(n=>`
          <a href="listing.html?id=${n.adId}" style="display:block;font-size:13.5px;color:var(--text);font-weight:600;line-height:1.6;padding:10px;background:var(--bg);border-radius:10px;">${escapeHTML(n.text)}</a>
        `).join('')}</div>`
      : `<p style="margin:0;color:var(--muted);font-size:13.5px;text-align:center;">لا توجد إشعارات حالياً</p>`}
  </div>`;

  const navEl = mount.querySelector('.mobile-nav');
  renderMnavNotch(navEl);
  window.addEventListener('resize', ()=> renderMnavNotch(navEl));
  syncInstallButtons();

  const searchBtn = document.getElementById('mnavSearchBtn');
  const searchBox = document.getElementById('mnavSearchBox');
  const alertsBtn = document.getElementById('mnavAlertsBtn');
  const alertsPanel = document.getElementById('mnavAlertsPanel');

  function closePopups(except){
    if(except!==searchBox) searchBox.classList.remove('open');
    if(except!==alertsPanel) alertsPanel.classList.remove('open');
  }
  searchBtn.addEventListener('click', e=>{
    e.stopPropagation();
    const willOpen = !searchBox.classList.contains('open');
    closePopups();
    if(willOpen){ searchBox.classList.add('open'); document.getElementById('mnavSearchInput').focus(); }
  });
  alertsBtn.addEventListener('click', e=>{
    e.stopPropagation();
    const willOpen = !alertsPanel.classList.contains('open');
    closePopups();
    if(willOpen){
      alertsPanel.classList.add('open');
      if(badgeOn){
        markNotificationsSeen(notes);
        badgeOn = false;
        const badge = alertsBtn.querySelector('.mnav-badge');
        if(badge) badge.remove();
      }
    }
  });
  document.addEventListener('click', ()=> closePopups());
  searchBox.addEventListener('click', e=> e.stopPropagation());
  alertsPanel.addEventListener('click', e=> e.stopPropagation());

  document.getElementById('mnavSearchForm').addEventListener('submit', e=>{
    e.preventDefault();
    const q = document.getElementById('mnavSearchInput').value.trim();
    location.href = 'index.html' + (q ? '?q=' + encodeURIComponent(q) : '');
  });

  /* The nav stays hidden while the category tabs are visible at the top of
     the page, and slides up into view (with a quick attention-grabbing
     bounce) the moment the tabs scroll out of view — reversing cleanly
     when the visitor scrolls back up to the tabs. */
  const tabsEl = document.getElementById('tabsNav');
  function showNav(){
    if(!navEl.classList.contains('mnav-hidden')) return;
    navEl.classList.remove('mnav-hidden');
    navEl.classList.remove('mnav-pop');
    void navEl.offsetWidth; // restart the animation each time it reappears
    navEl.classList.add('mnav-pop');
  }
  function hideNav(){
    navEl.classList.remove('mnav-pop');
    navEl.classList.add('mnav-hidden');
    closePopups();
  }
  if(tabsEl){
    const checkTabsVisibility = ()=>{
      const r = tabsEl.getBoundingClientRect();
      const tabsVisible = r.bottom > 0 && r.top < window.innerHeight;
      if(tabsVisible) hideNav(); else showNav();
    };
    window.addEventListener('scroll', checkTabsVisibility, { passive:true });
    checkTabsVisibility(); // set the correct initial state right away
  } else {
    // no category tabs on this page — just show the nav
    showNav();
  }
}

/* ---------------------------------------------------------
   Card renderers
   --------------------------------------------------------- */
function adCardHTML(ad){
  const title = escapeHTML(ad.title), desc = escapeHTML(ad.description);
  const seller = escapeHTML(ad.seller), city = escapeHTML(ad.city);
  return `
  <a class="ad-card" href="listing.html?id=${ad.id}">
    <div class="ad-thumb">
      ${ad.isNew ? `<span class="badge-new">جديد</span>`:''}
      <img src="${ad.images[0]}" alt="${title}" loading="lazy">
    </div>
    <div class="ad-body">
      <button class="fav-btn${isFavorite(ad.id)?' active':''}" type="button" onclick="event.preventDefault();toggleFavorite('${ad.id}').then(on=>{this.classList.toggle('active',on);this.dispatchEvent(new CustomEvent('fav-toggled',{bubbles:true,detail:{on}}));}).catch(()=>toast('تعذّر تحديث المفضلة، تحقق من اتصالك بالإنترنت','error'));">${ICONS.heart}</button>
      <h3 class="ad-title">${title}</h3>
      <p class="ad-desc">${desc}</p>
      <div class="ad-meta">
        <span>${ICONS.user}${seller}</span>
        <span>${ICONS.pin}${city}</span>
        <span>${ICONS.clock}${escapeHTML(ad.postedAgo)}</span>
        <span class="ad-price">${formatPrice(ad.price)}</span>
      </div>
    </div>
  </a>`;
}

function featuredItemHTML(ad){
  const title = escapeHTML(ad.title);
  return `
  <a class="featured-item" href="listing.html?id=${ad.id}">
    <img src="${ad.images[0]}" alt="${title}">
    <div>
      <p class="fi-title">${title}</p>
      <span class="fi-price">${formatPrice(ad.price)}</span>
    </div>
  </a>`;
}

async function renderFeaturedSidebar(excludeId){
  const mount = document.getElementById('featuredList');
  if(!mount) return;
  const [ads, commentCounts] = await Promise.all([getActiveAds(), getCommentCounts()]);
  const list = ads
    .filter(a=>a.id!==excludeId)
    .sort((a,b)=> engagementScore(b,commentCounts) - engagementScore(a,commentCounts) || (new Date(b.createdAt)) - (new Date(a.createdAt)))
    .slice(0,7);
  mount.innerHTML = list.map(featuredItemHTML).join('');
}

function similarCardHTML(ad){
  const title = escapeHTML(ad.title);
  return `
  <a class="similar-card" href="listing.html?id=${ad.id}">
    <img src="${ad.images[0]}" alt="${title}">
    <div class="sc-body">
      <p class="sc-title">${title}</p>
      <span class="sc-price">${formatPrice(ad.price)}</span>
    </div>
  </a>`;
}

/* ---------------------------------------------------------
   Analytics (demo, client-side only)
   No backend exists for these, so "visitors" here means browser
   sessions on THIS device/browser, not real cross-device site
   traffic. For real multi-user analytics you'd need a server-side
   tool (e.g. Plausible, GA, or a custom logging endpoint).
   --------------------------------------------------------- */
function todayStr(){ return new Date().toISOString().slice(0,10); }

function getSessionId(){
  let id = sessionStorage.getItem('sahat_session_id');
  if(!id){
    id = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
    sessionStorage.setItem('sahat_session_id', id);
  }
  return id;
}

function getSessions(){
  try{ return JSON.parse(localStorage.getItem('sahat_sessions') || '{}'); }
  catch(e){ return {}; }
}
/* Unbounded growth guard — a browser that keeps visiting the site for
   months would otherwise accumulate one entry per session forever. */
const SESSIONS_MAX_AGE = 90 * 24 * 60 * 60 * 1000;
function saveSessions(s){
  const cutoff = Date.now() - SESSIONS_MAX_AGE;
  const pruned = {};
  Object.keys(s).forEach(id => { if(s[id].lastSeen >= cutoff) pruned[id] = s[id]; });
  localStorage.setItem('sahat_sessions', JSON.stringify(pruned));
}

function classifyTrafficSource(referrer){
  if(!referrer) return 'مباشر';
  let host = '';
  try{ host = new URL(referrer).hostname.replace('www.','').toLowerCase(); }catch(e){ return 'أخرى'; }
  if(host === location.hostname) return 'داخلي (تصفح الموقع)';
  const searchEngines = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'yandex.'];
  const social = ['facebook.', 'instagram.', 'twitter.', 'x.com', 't.co', 'whatsapp.', 'telegram.', 'tiktok.', 'linkedin.', 'snapchat.'];
  if(searchEngines.some(s=> host.includes(s))) return 'محركات البحث';
  if(social.some(s=> host.includes(s))) return 'وسائل التواصل الاجتماعي';
  return host;
}

function trackVisit(){
  const id = getSessionId();
  const sessions = getSessions();
  const now = Date.now();
  if(!sessions[id]){
    sessions[id] = {
      date: todayStr(), firstSeen: now, lastSeen: now, pages: [location.pathname],
      source: classifyTrafficSource(document.referrer),
    };
  } else {
    sessions[id].lastSeen = now;
    if(!sessions[id].pages.includes(location.pathname)) sessions[id].pages.push(location.pathname);
  }
  saveSessions(sessions);

  // heartbeat so duration stays accurate even if the tab is closed abruptly
  setInterval(()=>{
    const s = getSessions();
    if(s[id]){ s[id].lastSeen = Date.now(); saveSessions(s); }
  }, 8000);
}

function getVisitorStats(){
  const sessions = getSessions();
  const today = todayStr();
  const weekAgo = Date.now() - 7*24*60*60*1000;
  const all = Object.values(sessions);
  const daily = all.filter(s=>s.date===today);
  const weekly = all.filter(s=> s.lastSeen >= weekAgo);
  const durations = all.map(s=> Math.max(0, s.lastSeen - s.firstSeen));
  const avgMs = durations.length ? durations.reduce((a,b)=>a+b,0)/durations.length : 0;

  const sourceCounts = {};
  all.forEach(s=>{
    const src = s.source || 'مباشر';
    sourceCounts[src] = (sourceCounts[src]||0) + 1;
  });
  const sources = Object.entries(sourceCounts)
    .map(([source,count])=>({source,count}))
    .sort((a,b)=> b.count - a.count);

  return {
    dailyCount: daily.length,
    weeklyCount: weekly.length,
    totalSessions: all.length,
    avgDurationSec: Math.round(avgMs/1000),
    sessions: all.sort((a,b)=> b.lastSeen - a.lastSeen),
    sources,
  };
}
function formatDuration(sec){
  if(sec < 60) return sec + ' ثانية';
  const m = Math.floor(sec/60), s = sec%60;
  return m + ' د ' + (s ? s+' ث' : '');
}

/* ---- Filter/search usage tracking (for "تتبع الإعلانات للفلترة") ---- */
function trackFilterEvent(type, value){
  if(!value) return;
  try{
    const list = JSON.parse(localStorage.getItem('sahat_filter_events') || '[]');
    list.push({ date: todayStr(), type, value, ts: Date.now() });
    if(list.length > 500) list.shift();
    localStorage.setItem('sahat_filter_events', JSON.stringify(list));
  }catch(e){}
}
function getFilterStats(){
  let list = [];
  try{ list = JSON.parse(localStorage.getItem('sahat_filter_events') || '[]'); }catch(e){}
  const counts = {};
  list.forEach(ev=>{
    const key = ev.type + ':' + ev.value;
    counts[key] = (counts[key]||0) + 1;
  });
  return Object.entries(counts)
    .map(([key,count])=>{
      const [type,value] = key.split(':');
      return { type, value, count };
    })
    .sort((a,b)=> b.count - a.count);
}

/* ---- Automatic error logging ---- */
function getErrorWebhook(){ return localStorage.getItem('sahat_error_webhook') || ''; }
function setErrorWebhook(url){ localStorage.setItem('sahat_error_webhook', url || ''); }

function logError(entry){
  try{
    const list = JSON.parse(localStorage.getItem('sahat_errors') || '[]');
    list.unshift(entry);
    if(list.length > 200) list.length = 200;
    localStorage.setItem('sahat_errors', JSON.stringify(list));
  }catch(e){}
  // best-effort auto-send if the admin configured a webhook (e.g. a Slack/Discord/custom endpoint)
  const hook = getErrorWebhook();
  if(hook){
    fetch(hook, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(entry),
    }).catch(()=>{ /* silent — no network or endpoint unreachable, error stays logged locally */ });
  }
}
function getErrors(){
  try{ return JSON.parse(localStorage.getItem('sahat_errors') || '[]'); }
  catch(e){ return []; }
}
function clearErrors(){ localStorage.removeItem('sahat_errors'); }

window.addEventListener('error', e=>{
  logError({
    date: new Date().toISOString(),
    message: e.message || 'خطأ غير معروف',
    source: e.filename ? e.filename.split('/').pop() : location.pathname,
    line: e.lineno || null,
    col: e.colno || null,
    page: location.pathname,
  });
});
window.addEventListener('unhandledrejection', e=>{
  logError({
    date: new Date().toISOString(),
    message: 'Promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)),
    source: location.pathname,
    line: null, col: null,
    page: location.pathname,
  });
});

/* ---------------------------------------------------------
   Init on every page
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  if(!location.pathname.includes('admin')) trackVisit();
});
