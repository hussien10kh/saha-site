/* =========================================================
   ساحة | Admin dashboard — js/admin.js
   Loaded only by admin.html, after js/app.js (shared helpers
   + ICONS + getAdsByOwner/getComments/etc already available).
   Admin write access (delete any ad/comment, edit any ad) is
   enforced server-side by RLS via profiles.is_admin — see
   supabase_schema.sql — this file just drives the UI.
   ========================================================= */

const ADMIN_ICONS = {
  overview:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="12" width="8" height="9" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></svg>`,
  ads:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  comments:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1-4.8A8.4 8.4 0 1 1 21 11.5Z"/></svg>`,
  settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
  logout:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  move:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>`,
  renew:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>`,
  eye:ICONS.eye,
  menu:ICONS.menu,
  close:ICONS.close,
  visitors:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  errors:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.9 18.5a1.7 1.7 0 0 0 1.5 2.6h17.2a1.7 1.7 0 0 0 1.5-2.6L13.7 3.9a1.7 1.7 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>`,
};

let currentTab = 'overview';
let editingAdId = null;
let adminUser = null;

// عدّادات المحتوى الخاضع للإشراف (السياحة + أنواع ملعبك السبعة): لكل نوع
// {pending, approved, rejected}. المعلّق بيظهر كـbadge أحمر بجانب التبويب،
// والباقي بيستعمله ملخّص "نظرة عامة".
let contentCounts = {};

// ---------- Modal: عرض كامل تفاصيل عنصر معلّق ----------
// خرائط عربية للتسميات
const FIELD_LABELS = {
  name:'الاسم', sport:'الرياضة', specialty:'التخصص', sports:'الرياضات',
  category:'النوع', type:'النوع',
  governorate:'المحافظة', region:'المحافظة', city:'المدينة', address:'العنوان',
  price:'السعر', pay_mode:'طريقة الدفع', price_per_session:'سعر الحصة',
  monthly_fee:'الاشتراك الشهري', fee:'الرسوم',
  phone:'الهاتف', experience:'سنوات الخبرة', gender:'الجنس',
  age:'العمر', age_groups:'الفئات العمرية', position:'المركز', foot:'القدم المفضلة',
  description:'الوصف', players:'اللاعبين', field_count:'عدد الملاعب',
  area:'المساحة', surface:'الأرضية', amenities:'الخدمات',
  lat:'خط العرض', lng:'خط الطول',
  video_url:'رابط فيديو يوتيوب', image:'الصورة', images:'الصور',
  watermark_included:'علامة مائية', videos:'الفيديوهات',
  venue_name:'الملعب', date_label:'التاريخ', time:'الوقت', day:'اليوم',
  level:'المستوى', max_participants:'الحد الأقصى للمشاركين',
  max_teams:'الحد الأقصى للفرق', participants:'المشاركين', teams:'الفرق',
  coach:'المدرب', period:'الفترة',
  created_at:'تاريخ الإنشاء', status:'الحالة',
};
const HIDDEN_FIELDS = new Set(['id','owner_id','added_by','reviewed_by','reviewed_at','rating_avg','review_count','image','images']);

// ترجمة قيم الحقول الـenum من الإنجليزي للعربي عشان الأدمن يفهم مباشرة
const VALUE_TRANSLATIONS = {
  pay_mode: { fixed:'مبلغ ثابت', percent:'نسبة مئوية', none:'بدون دفع مسبق' },
  category: { landmark:'معلم أثري', restaurant:'مطعم', cafe:'مقهى', garden:'حديقة', shop:'متجر', other:'أخرى' },
  status:   { pending:'قيد المراجعة', approved:'موافق عليه', rejected:'مرفوض' },
};

function formatFieldValue(k, v){
  if (v === null || v === undefined || v === '') return '<span style="color:var(--muted);">—</span>';
  // ترجمة enums
  if (VALUE_TRANSLATIONS[k] && VALUE_TRANSLATIONS[k][v]) return escapeHTML(VALUE_TRANSLATIONS[k][v]);
  if (k === 'video_url' || (typeof v === 'string' && v.startsWith('http'))) {
    return `<a href="${escapeHTML(v)}" target="_blank" rel="noopener">${escapeHTML(v.length>60?v.slice(0,60)+'…':v)}</a>`;
  }
  if (k === 'created_at' || k === 'reviewed_at') {
    try { return escapeHTML(new Date(v).toLocaleString('ar-SY')); } catch(e){}
  }
  if (Array.isArray(v)) return v.length ? v.map(x=>`<span class="tag" style="display:inline-block;padding:2px 8px;background:var(--border);border-radius:999px;font-size:12px;margin:2px 3px;">${escapeHTML(String(x))}</span>`).join('') : '—';
  if (typeof v === 'boolean') return v ? '✓ نعم' : '✗ لا';
  if (typeof v === 'object') return `<pre style="font-size:11px;background:var(--border);padding:6px;border-radius:6px;white-space:pre-wrap;">${escapeHTML(JSON.stringify(v,null,2))}</pre>`;
  return escapeHTML(String(v));
}

function openReviewModal(item, opts={}){
  // opts: { title, onApprove(id), onReject(id) }
  const overlay = document.createElement('div');
  overlay.className = 'admin-review-overlay';

  // gallery
  const images = (item.images && item.images.length) ? item.images : (item.image && String(item.image).startsWith('http') ? [item.image] : []);
  const galleryHTML = images.length
    ? `<div class="admin-review-gallery">${images.map(u=>`<img src="${escapeHTML(u)}" alt="">`).join('')}</div>` : '';

  // fields (كل ما مو مخفي)
  const fieldsHTML = Object.entries(item)
    .filter(([k,v]) => !HIDDEN_FIELDS.has(k))
    .map(([k,v]) => {
      const label = FIELD_LABELS[k] || k;
      return `<div class="admin-review-field"><div class="k">${escapeHTML(label)}</div><div class="v">${formatFieldValue(k,v)}</div></div>`;
    }).join('');

  // YouTube embed لو موجود
  const ytId = item.video_url && MalaabakAPI.parseYouTubeId ? MalaabakAPI.parseYouTubeId(item.video_url) : null;
  const embedHTML = ytId ? `
    <div style="position:relative;padding-bottom:56.25%;height:0;border-radius:10px;overflow:hidden;background:#000;margin-bottom:14px;">
      <iframe src="https://www.youtube.com/embed/${ytId}?rel=0" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe>
    </div>` : '';

  overlay.innerHTML = `
    <div class="admin-review-modal">
      <div class="admin-review-head">
        <h2>${escapeHTML(opts.title || 'مراجعة كاملة — ' + (item.name || item.title || ''))}</h2>
        <button type="button" class="admin-review-close" aria-label="إغلاق">×</button>
      </div>
      <div class="admin-review-body">
        ${galleryHTML}
        ${embedHTML}
        ${fieldsHTML}
      </div>
      ${(opts.onApprove || opts.onReject) ? `
        <div class="admin-review-actions">
          ${opts.onApprove ? '<button type="button" class="btn btn-primary" data-act="approve">موافقة</button>' : ''}
          ${opts.onReject ? '<button type="button" class="btn btn-danger" data-act="reject">رفض</button>' : ''}
        </div>` : ''}
    </div>`;

  const close = () => overlay.remove();
  overlay.querySelector('.admin-review-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const act = btn.dataset.act;
      btn.disabled = true; btn.textContent = '...';
      try {
        if (act === 'approve' && opts.onApprove) await opts.onApprove(item.id);
        if (act === 'reject'  && opts.onReject)  await opts.onReject(item.id);
        close();
      } catch(err) {
        alert('تعذّر الحفظ: ' + (err.message || err));
        btn.disabled = false; btn.textContent = act === 'approve' ? 'موافقة' : 'رفض';
      }
    });
  });

  document.body.appendChild(overlay);
}

async function refreshContentCounts(){
  try {
    const keys = Object.keys(CONTENT);
    // استعلام واحد خفيف لكل جدول (عمود الحالة بس) والعدّ هون — 8 استعلامات بالتوازي
    const results = await Promise.all(keys.map(k => sb.from(CONTENT[k].table).select('status')));
    keys.forEach((k, i) => {
      const c = { pending:0, approved:0, rejected:0 };
      (results[i].data || []).forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
      contentCounts[k] = c;
    });
  } catch(e){ console.error('refreshContentCounts failed:', e); }
}
const pendingOf = (k) => (contentCounts[k] && contentCounts[k].pending) || 0;

async function initAdmin(){
  try{
    if(!(await requireAdmin())) return;
    adminUser = await getCurrentUser();
  }catch(e){
    console.error('initAdmin failed:', e);
    document.getElementById('adminContent').innerHTML =
      '<div class="admin-empty">تعذّر تحميل لوحة التحكم، تحقق من اتصالك بالإنترنت وحاول تحديث الصفحة.</div>';
    return;
  }
  await refreshContentCounts();
  renderSidebar();
  renderTopbar();
  renderTab();
}

// تحديث العدّادات بعد أي قرار إشرافي (موافقة/رفض/إخفاء/حذف) بلا ما نعيد رسم التبويب الحالي
async function refreshCountsAndSidebar(){
  await refreshContentCounts();
  renderSidebar();
}

function renderSidebar(){
  const mount = document.getElementById('adminSidebar');
  // أربعة أقسام: الإعلانات · السياحة · ملعبك · الحسابات. كل بند محتوى بيفتح عرض
  // كامل (بانتظار المراجعة / منشور / مرفوض) — الرقم الأحمر = بانتظار المراجعة.
  const sections = [
    { title:'الإعلانات', items:[
      {id:'overview', label:'نظرة عامة', icon:ADMIN_ICONS.overview},
      {id:'ads',      label:'الإعلانات', icon:ADMIN_ICONS.ads},
      {id:'comments', label:'تعليقات الإعلانات', icon:ADMIN_ICONS.comments},
      {id:'settings', label:'الإعدادات', icon:ADMIN_ICONS.settings},
    ]},
    { title:'التحليلات', items:[
      {id:'visitors', label:'الزوار',        icon:ADMIN_ICONS.visitors},
      {id:'funnel',   label:'مسار التحويل',  icon:ADMIN_ICONS.overview},
      {id:'quality',  label:'أخطاء وأداء',   icon:ADMIN_ICONS.errors},
    ]},
    { title:'السياحة', items:[
      {id:'tourism-places',  label:'الأماكن السياحية', icon:ADMIN_ICONS.overview, badge: pendingOf('tourism')},
      {id:'tourism-reviews', label:'تعليقات السياحة',  icon:ADMIN_ICONS.comments},
    ]},
    { title:'الرياضة (ملعبك)', items:[
      {id:'malaab-venues',    label:'الملاعب',      icon:ADMIN_ICONS.overview, badge: pendingOf('venues')},
      {id:'malaab-coaches',   label:'المدربون',     icon:ADMIN_ICONS.overview, badge: pendingOf('coaches')},
      {id:'malaab-academies', label:'الأكاديميات',  icon:ADMIN_ICONS.overview, badge: pendingOf('academies')},
      {id:'malaab-talents',   label:'المواهب',      icon:ADMIN_ICONS.overview, badge: pendingOf('talents')},
      {id:'malaab-matches',   label:'المباريات',    icon:ADMIN_ICONS.overview, badge: pendingOf('matches')},
      {id:'malaab-trainings', label:'التمارين',     icon:ADMIN_ICONS.overview, badge: pendingOf('trainings')},
      {id:'malaab-events',    label:'الفعاليات',    icon:ADMIN_ICONS.overview, badge: pendingOf('events')},
      {id:'malaab-reviews',   label:'تقييمات ملعبك', icon:ADMIN_ICONS.comments},
      {id:'malaab-bookings',  label:'حجوزات ملعبك',  icon:ADMIN_ICONS.ads},
    ]},
    { title:'الحسابات', items:[
      {id:'users-all',    label:'كل الحسابات',   icon:ADMIN_ICONS.visitors},
      {id:'users-admins', label:'المشرفون',       icon:ADMIN_ICONS.settings},
    ]},
  ];
  const renderItem = (i) => {
    const badge = i.badge ? `<span class="admin-nav-badge">${i.badge}</span>` : '';
    return `<button class="admin-nav-item ${currentTab===i.id?'active':''}" data-tab="${i.id}">${i.icon}<span>${i.label}</span>${badge}</button>`;
  };
  mount.innerHTML = `
    <div class="admin-logo">ساحة<span>.</span> إدارة</div>
    ${sections.map((s,idx)=>`
      <div class="admin-nav-heading" style="font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--muted);text-transform:uppercase;padding:${idx===0?'0':'14px 12px 6px'};margin-top:${idx===0?'0':'6px'};border-top:${idx===0?'none':'1px solid var(--border)'};">${s.title}</div>
      ${s.items.map(renderItem).join('')}
    `).join('')}
    <div class="admin-nav-spacer"></div>
    <a class="admin-nav-item" href="ads.html" target="_blank">${ICONS.home}<span>عرض الموقع</span></a>
    <button class="admin-nav-item" id="adminLogoutBtn">${ADMIN_ICONS.logout}<span>تسجيل خروج</span></button>
  `;
  mount.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentTab = btn.dataset.tab;
      renderSidebar();
      renderTopbar();
      renderTab();
      document.getElementById('adminSidebar').classList.remove('open');
      // ارجع لأعلى الصفحة عند تبديل تبويب — كنا نبقى مكاننا من التبويب السابق
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  document.getElementById('adminLogoutBtn').addEventListener('click', async ()=>{
    await adminLogout();
    location.href = 'admin-login.html';
  });
}

function renderTopbar(){
  const titles = {
    overview:'نظرة عامة', ads:'الإعلانات — كل الإعلانات', visitors:'التحليلات — الزوار', funnel:'التحليلات — مسار التحويل', quality:'التحليلات — أخطاء وأداء',
    comments:'الإعلانات — التعليقات', settings:'الإعدادات',
    'tourism-places':'السياحة — الأماكن السياحية',
    'tourism-reviews':'السياحة — التعليقات',
    'malaab-venues':'ملعبك — الملاعب',
    'malaab-coaches':'ملعبك — المدربون',
    'malaab-academies':'ملعبك — الأكاديميات',
    'malaab-talents':'ملعبك — المواهب',
    'malaab-matches':'ملعبك — المباريات',
    'malaab-trainings':'ملعبك — التمارين',
    'malaab-events':'ملعبك — الفعاليات',
    'malaab-reviews':'ملعبك — التقييمات',
    'malaab-bookings':'ملعبك — الحجوزات',
    'users-all':'الحسابات — كل المستخدمين',
    'users-admins':'الحسابات — المشرفون',
  };
  document.getElementById('adminTopbar').innerHTML = `
    <button class="admin-icon-btn" id="sidebarToggle" style="display:none;" aria-label="فتح قائمة التنقل">${ADMIN_ICONS.menu}</button>
    <div class="admin-title">${titles[currentTab]}</div>
    <div class="admin-user-chip"><span class="dot"></span>${escapeHTML((adminUser && adminUser.email) || '')}</div>
  `;
  const toggle = document.getElementById('sidebarToggle');
  toggle.addEventListener('click', ()=> document.getElementById('adminSidebar').classList.toggle('open'));
}

function renderTab(){
  const mount = document.getElementById('adminContent');
  if(currentTab==='overview') return renderOverview(mount);
  if(currentTab==='ads') return renderAdsTab(mount);
  if(currentTab==='visitors') return renderVisitorsTab(mount);
  if(currentTab==='funnel') return renderFunnelTab(mount);
  if(currentTab==='quality') return renderQualityTab(mount);
  if(currentTab==='comments') return renderCommentsTab(mount);
  if(currentTab==='settings') return renderSettingsTab(mount);
  if(currentTab==='tourism-places') return renderModeration(mount, 'tourism');
  if(currentTab==='tourism-reviews') return renderTourismReviews(mount);
  if(currentTab==='malaab-reviews') return renderMalaabReviews(mount);
  if(currentTab==='malaab-bookings') return renderMalaabBookings(mount);
  if(currentTab==='users-all')    return renderUsers(mount, false);
  if(currentTab==='users-admins') return renderUsers(mount, true);
  if(currentTab && currentTab.startsWith('malaab-')) return renderModeration(mount, currentTab.slice('malaab-'.length));
}

/* Admin needs to see EVERY ad (including expired ones), so it fetches
   directly instead of using the public getActiveAds() cutoff. */
async function getAllAdsAdmin(){
  const { data, error } = await sb.from('ads').select('*, profiles!ads_owner_id_fkey(created_at)').order('created_at', {ascending:false});
  if(error) return [];
  return data.map(mapAdRow);
}

/* ---------------- Overview ---------------- */
async function renderOverview(mount){
  const [ads, comments] = await Promise.all([getAllAdsAdmin(), getAllCommentsFlat()]);
  const totalViews = ads.reduce((s,a)=> s + (a.views||0), 0);
  // زوار آخر 7 أيام من site_events (كل الموقع) — لو الجدول مو جاهز بعد منعرض صفر مع تلميح بتبويب الزوار
  let vstats = { dailyCount:0, weeklyCount:0, avgDurationSec:0 };
  try { const st = summarizeEvents(await loadStats(7)); vstats = { dailyCount: st.visitsToday, weeklyCount: st.visits, avgDurationSec: st.avgDuration }; }
  catch(e){ console.warn('site_events غير متاح بعد:', e.message); }
  const byCategory = {
    realestate: ads.filter(a=>a.category==='realestate').length,
    cars: ads.filter(a=>a.category==='cars').length,
    misc: ads.filter(a=>a.category==='misc').length,
  };
  mount.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num">${vstats.dailyCount}</div><div class="stat-label">زيارات اليوم</div></div>
      <div class="stat-card"><div class="stat-num">${vstats.weeklyCount}</div><div class="stat-label">زيارات آخر 7 أيام</div></div>
      <div class="stat-card"><div class="stat-num">${formatDuration(vstats.avgDurationSec)}</div><div class="stat-label">متوسط مدة الزيارة</div></div>
      <div class="stat-card"><div class="stat-num">${ads.length}</div><div class="stat-label">إجمالي الإعلانات</div></div>
    </div>
    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="stat-card"><div class="stat-num">${comments.length}</div><div class="stat-label">إجمالي التعليقات</div></div>
      <div class="stat-card"><div class="stat-num">${totalViews.toLocaleString('en-US')}</div><div class="stat-label">إجمالي المشاهدات</div></div>
      <div class="stat-card"><div class="stat-num">${byCategory.realestate}</div><div class="stat-label">إعلانات عقار</div></div>
      <div class="stat-card"><div class="stat-num">${byCategory.cars}</div><div class="stat-label">إعلانات سيارات</div></div>
    </div>
    <h3 class="section-heading" style="margin-top:8px;">المحتوى الخاضع للمراجعة</h3>
    <div class="content-summary">
      ${Object.keys(CONTENT).map(k=>{
        const c = contentCounts[k] || { pending:0, approved:0, rejected:0 };
        const tab = k==='tourism' ? 'tourism-places' : 'malaab-'+k;
        return `
        <button type="button" class="content-summary-card" data-goto="${tab}">
          <div class="cs-label">${CONTENT[k].label}</div>
          <div class="cs-row">
            <span class="cs-pill ${c.pending?'is-pending':''}">${c.pending} بانتظار المراجعة</span>
            <span class="cs-pill is-approved">${c.approved} منشور</span>
            <span class="cs-pill">${c.rejected} مرفوض</span>
          </div>
        </button>`;
      }).join('')}
    </div>
    <h3 class="section-heading" style="margin-top:8px;">أحدث الإعلانات</h3>
    ${adsTableHTML(ads.slice(0,5), false)}
  `;
  wireAdsTableActions(mount);
  mount.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => gotoTab(b.dataset.goto)));
}

function gotoTab(id){
  currentTab = id;
  renderSidebar(); renderTopbar(); renderTab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- Ads tab ---------------- */
/* الإعلانات ما إلها مراجعة — بتنشر فوراً وبتنتهي بعد AD_EXPIRY_DAYS يوم.
   الأدوات هون: بحث + فلترة بالقسم والحالة، ولكل إعلان: فتح / تعديل / نقل لقسم
   أو مدينة تانية / تجديد النشر (لو منتهي) / حذف نهائي. */
const adIsExpired = (ad) => (Date.now() - new Date(ad.createdAt).getTime()) > AD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

async function renderAdsTab(mount){
  const catOptions = Object.entries(CATEGORY_LABELS).map(([k,v])=>`<option value="${k}">${escapeHTML(v)}</option>`).join('');
  mount.innerHTML = `
    <div class="admin-toolbar">
      <input type="search" class="admin-search" id="adSearch" placeholder="ابحث بالعنوان أو المدينة أو اسم المعلن...">
      <select id="adCatFilter" class="admin-select"><option value="">كل الأقسام</option>${catOptions}</select>
      <select id="adStateFilter" class="admin-select">
        <option value="">كل الإعلانات</option>
        <option value="active">ظاهرة على الموقع</option>
        <option value="expired">منتهية (مخفية)</option>
      </select>
      <button class="btn btn-primary" id="addAdBtn">${ADMIN_ICONS.plus}إضافة إعلان</button>
    </div>
    <div id="adsTableWrap"></div>
  `;
  const allAds = await getAllAdsAdmin();
  const renderList = ()=>{
    const q = document.getElementById('adSearch').value.trim().toLowerCase();
    const cat = document.getElementById('adCatFilter').value;
    const state = document.getElementById('adStateFilter').value;
    let ads = allAds;
    if(q) ads = ads.filter(a => [a.title, a.city, a.seller].some(v => (v||'').toLowerCase().includes(q)));
    if(cat) ads = ads.filter(a => a.category === cat);
    if(state === 'active') ads = ads.filter(a => !adIsExpired(a));
    if(state === 'expired') ads = ads.filter(a => adIsExpired(a));
    const wrap = document.getElementById('adsTableWrap');
    wrap.innerHTML = `<p class="admin-count">${ads.length} إعلان${ads.length !== allAds.length ? ` من أصل ${allAds.length}` : ''}</p>` + adsTableHTML(ads, true);
    wireAdsTableActions(wrap);
  };
  ['adSearch','adCatFilter','adStateFilter'].forEach(id => document.getElementById(id).addEventListener('input', renderList));
  document.getElementById('addAdBtn').addEventListener('click', ()=> openAdModal(null));
  renderList();
}

function adsTableHTML(ads, showActions){
  if(!ads.length) return `<div class="admin-empty">لا توجد إعلانات</div>`;
  return `
  <table class="admin-table">
    <thead><tr>
      <th></th><th>العنوان</th><th>القسم</th><th>السعر</th><th>المدينة</th><th>المعلن</th><th>النشر</th>${showActions?'<th></th>':''}
    </tr></thead>
    <tbody>
      ${ads.map(ad=>`
        <tr data-id="${ad.id}">
          <td><img src="${ad.images[0] || PLACEHOLDER_IMG}" alt=""></td>
          <td class="cell-title">${escapeHTML(ad.title)}</td>
          <td><span class="admin-badge">${escapeHTML(CATEGORY_LABELS[ad.category]||ad.category)}</span></td>
          <td>${formatPrice(ad.price)}</td>
          <td>${escapeHTML(ad.city)}</td>
          <td>${escapeHTML(ad.seller||'—')}</td>
          <td>${escapeHTML(ad.postedAgo)}${adIsExpired(ad) ? ' <span class="admin-badge is-expired">منتهي</span>' : ''}</td>
          ${showActions ? `
          <td>
            <div class="row-actions">
              <a class="admin-icon-btn" href="listing.html?id=${ad.id}" target="_blank" title="فتح على الموقع" aria-label="فتح الإعلان على الموقع">${ADMIN_ICONS.eye}</a>
              <button class="admin-icon-btn edit-ad-btn" title="تعديل" aria-label="تعديل الإعلان">${ADMIN_ICONS.edit}</button>
              <button class="admin-icon-btn move-ad-btn" title="نقل لقسم أو مدينة تانية" aria-label="نقل الإعلان">${ADMIN_ICONS.move}</button>
              ${adIsExpired(ad) ? `<button class="admin-icon-btn renew-ad-btn" title="تجديد النشر (يرجع يظهر 90 يوم)" aria-label="تجديد نشر الإعلان">${ADMIN_ICONS.renew}</button>` : ''}
              <button class="admin-icon-btn danger delete-ad-btn" title="حذف نهائي" aria-label="حذف الإعلان نهائياً">${ADMIN_ICONS.trash}</button>
            </div>
          </td>` : ''}
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

function wireAdsTableActions(scope){
  const loadAd = async (btn, what) => {
    const id = btn.closest('tr').dataset.id;
    try{ return await getAdById(id); }
    catch(e){ console.error(`admin getAdById (${what}) failed:`, e); toast('تعذّر تحميل بيانات الإعلان، تحقق من اتصالك بالإنترنت', 'error'); return null; }
  };
  scope.querySelectorAll('.edit-ad-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{ const ad = await loadAd(btn, 'edit'); if(ad) openAdModal(ad); });
  });
  scope.querySelectorAll('.move-ad-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{ const ad = await loadAd(btn, 'move'); if(ad) openMoveAdModal(ad); });
  });
  scope.querySelectorAll('.renew-ad-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const ad = await loadAd(btn, 'renew'); if(!ad) return;
      if(!confirm(`تجديد نشر "${ad.title}"؟ رح يرجع يظهر على الموقع ${AD_EXPIRY_DAYS} يوم من اليوم.`)) return;
      try{ await renewAd(ad.id); toast('تم تجديد النشر'); renderTab(); }
      catch(e){ console.error('admin renew ad failed:', e); toast('تعذّر تجديد الإعلان، تحقق من اتصالك بالإنترنت', 'error'); }
    });
  });
  scope.querySelectorAll('.delete-ad-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const ad = await loadAd(btn, 'delete'); if(!ad) return;
      if(confirm(`حذف الإعلان "${ad.title}" نهائياً مع تعليقاته؟\nهالعملية ما بتنرجع.`)){
        try{
          await deleteAd(ad.id);
          toast('تم حذف الإعلان');
          renderTab();
        }catch(e){
          console.error('admin delete ad failed:', e);
          toast('تعذّر حذف الإعلان، تحقق من اتصالك بالإنترنت', 'error');
        }
      }
    });
  });
}

/* نقل إعلان لقسم أو مدينة تانية — بلا ما نفتح كل حقول التعديل */
function openMoveAdModal(ad){
  const catOptions = Object.entries(CATEGORY_LABELS).map(([k,v])=>`<option value="${k}" ${k===ad.category?'selected':''}>${escapeHTML(v)}</option>`).join('');
  document.getElementById('modalTitle').textContent = 'نقل الإعلان: ' + ad.title;
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>القسم</label><select id="mvCategory">${catOptions}</select></div>
      <div class="field"><label>المدينة</label><input type="text" id="mvCity" value="${escapeHTML(ad.city||'')}"></div>
    </div>
    <p class="admin-hint">بينتقل الإعلان فوراً للقسم/المدينة الجديدة على الموقع، بلا تغيير على باقي بياناته.</p>
    <div class="form-actions">
      <button type="button" class="btn btn-primary btn-lg" id="mvSaveBtn">نقل</button>
      <button type="button" class="btn btn-outline btn-lg" id="mvCancelBtn">إلغاء</button>
    </div>`;
  document.getElementById('mvCancelBtn').addEventListener('click', closeAdModal);
  document.getElementById('mvSaveBtn').addEventListener('click', async ()=>{
    const category = document.getElementById('mvCategory').value;
    const city = document.getElementById('mvCity').value.trim();
    if(!city){ toast('اكتب المدينة', 'error'); return; }
    try{ await updateAd(ad.id, { category, city }); toast('تم نقل الإعلان'); }
    catch(e){ console.error('admin move ad failed:', e); toast('تعذّر نقل الإعلان، تحقق من اتصالك بالإنترنت', 'error'); return; }
    closeAdModal(); renderTab();
  });
  document.getElementById('adModal').classList.add('open');
}

/* ---------------- Ad add/edit modal ---------------- */
function openAdModal(ad){
  editingAdId = ad ? ad.id : null;
  document.getElementById('modalTitle').textContent = ad ? 'تعديل الإعلان' : 'إضافة إعلان جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="field full">
      <label>القسم</label>
      <select id="mCategory">
        ${Object.entries(CATEGORY_LABELS).map(([k,v])=>`<option value="${k}">${escapeHTML(v)}</option>`).join('')}
      </select>
    </div>
    <div class="field full"><label>عنوان الإعلان</label><input type="text" id="mTitle"></div>
    <div class="form-grid">
      <div class="field"><label>السعر (ل.س)</label><input type="number" id="mPrice" min="0"></div>
      <div class="field"><label>المدينة</label><input type="text" id="mCity"></div>
    </div>
    <div class="field full"><label>الوصف</label><textarea id="mDesc"></textarea></div>
    <div class="form-grid">
      <div class="field"><label>اسم المعلن</label><input type="text" id="mSeller"></div>
      <div class="field"><label>رابط الصورة</label><input type="text" id="mImage" placeholder="https://..."></div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-primary btn-lg" id="saveAdBtn">${ad?'حفظ التعديلات':'نشر الإعلان'}</button>
      <button type="button" class="btn btn-outline btn-lg" id="cancelAdBtn">إلغاء</button>
    </div>
  `;
  if(ad){
    document.getElementById('mCategory').value = ad.category;
    document.getElementById('mTitle').value = ad.title;
    document.getElementById('mPrice').value = ad.price;
    document.getElementById('mCity').value = ad.city;
    document.getElementById('mDesc').value = ad.description;
    document.getElementById('mSeller').value = ad.seller;
    document.getElementById('mImage').value = ad.images[0] || '';
  }
  document.getElementById('cancelAdBtn').addEventListener('click', closeAdModal);
  document.getElementById('saveAdBtn').addEventListener('click', saveAdFromModal);
  document.getElementById('adModal').classList.add('open');
}
function closeAdModal(){ document.getElementById('adModal').classList.remove('open'); editingAdId = null; }

async function saveAdFromModal(){
  const title = document.getElementById('mTitle').value.trim();
  const price = Number(document.getElementById('mPrice').value);
  const city = document.getElementById('mCity').value.trim();
  const description = document.getElementById('mDesc').value.trim();
  const seller = document.getElementById('mSeller').value.trim();
  const category = document.getElementById('mCategory').value;
  const imageUrl = document.getElementById('mImage').value.trim();

  if(!title || !price || !city || !description || !seller){
    toast('الرجاء تعبئة جميع الحقول', 'error');
    return;
  }

  try{
    if(editingAdId){
      await updateAd(editingAdId, { title, price, city, description, seller, category, images: imageUrl ? [imageUrl] : [] });
      toast('تم حفظ التعديلات');
    } else {
      await addAd({
        title, price, city, description, seller, category,
        images: imageUrl ? [imageUrl] : [], contactMethod:'replies', views:0,
        ownerId: adminUser.id,
      });
      toast('تم نشر الإعلان');
    }
  }catch(e){
    console.error('admin save ad failed:', e);
    toast('تعذّر حفظ الإعلان، تحقق من اتصالك بالإنترنت', 'error');
    return;
  }
  closeAdModal();
  renderTab();
}

/* ================= التحليلات — من جدول site_events (كل الموقع، كل الأقسام) =================
   المصدر js/site-stats.js: pageview (فتح صفحة + الأداء + نظام التشغيل) · pageleave (مدة
   البقاء الفعلية) · login / signup / post · step (contact, form_start, form_submit) ·
   error (أخطاء الزوار). الزيارة = session_id واحد (بيموت مع التبويب).
   ثلاث شاشات: الزوار (من وين وكيف) · مسار التحويل (وين بيوقفوا) · أخطاء وأداء (شو بيكسر). */
const STATS_COLS = 'type,session_id,visitor_id,view_id,user_id,section,path,title,referrer,utm_source,utm_medium,utm_campaign,device,duration_sec,meta,created_at';
const SECTION_LABEL = { ads:'الإعلانات', tourism:'السياحة', malaab:'ملعبك' };
const METHOD_LABEL = { email:'بريد', google:'جوجل', guest:'ضيف' };
const CONTACT_LABEL = { phone:'اتصال', whatsapp:'واتساب', directions:'اتجاهات' };
const OS_LABEL = { android:'أندرويد', ios:'آيفون', windows:'ويندوز', mac:'ماك', linux:'لينكس', other:'أخرى' };
const POST_LABEL = { ad:'إعلان', place:'مكان سياحي', venue:'ملعب', coach:'مدرب', academy:'أكاديمية', talent:'موهبة', match:'مباراة', training:'تمرين', event:'فعالية' };
const WEEKDAY = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
let statsDays = 7;
let statsCache = null;

async function fetchSiteEvents(days){
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const rows = []; const PAGE = 1000; let from = 0;
  while(true){
    const { data, error } = await sb.from('site_events').select(STATS_COLS)
      .gte('created_at', since).order('created_at', { ascending:false }).range(from, from + PAGE - 1);
    if(error) throw error;
    rows.push(...(data || []));
    if(!data || data.length < PAGE || rows.length >= 30000) break;
    from += PAGE;
  }
  return rows;
}
// الشاشات الثلاث بتشارك نفس القراءة (دقيقة كاش) حتى التنقّل بيناتها ما يعيد التحميل
async function loadStats(days, force){
  if(!force && statsCache && statsCache.days === days && Date.now() - statsCache.at < 60000) return statsCache.rows;
  const rows = await fetchSiteEvents(days);
  statsCache = { days, at: Date.now(), rows };
  return rows;
}

const dayKey = (t) => new Date(t).toLocaleDateString('en-CA');   // YYYY-MM-DD بالتوقيت المحلي
const isDetailPath = (p) => /^\/listing\.html|^\/tourism\/place\.html|^\/malaab\/[a-z]+-detail\.html/.test(p || '');
const isAddPath = (p) => /^\/add-ad\.html|^\/tourism\/add-place\.html|^\/malaab\/add-[a-z]+\.html/.test(p || '');
const isLoginPath = (p) => /^\/login\.html|^\/malaab\/(login|register)\.html/.test(p || '');
const sectionOfPath = (p) => /^\/tourism\//.test(p || '') ? 'tourism' : /^\/malaab\//.test(p || '') ? 'malaab' : 'ads';
const sourceLabel = (r) => r.utm_source ? `${r.utm_source}${r.utm_campaign ? ' / ' + r.utm_campaign : ''}` : r.referrer ? r.referrer.split('/')[0] : 'مباشر / محفوظ';

function summarizeEvents(rows){
  const sessions = new Map();
  const S = (id) => { let s = sessions.get(id); if(!s){ s = { id, start:Infinity, end:0, views:0, duration:0, sections:new Set(), device:null, os:null, source:null, sourceAt:Infinity,
    user_id:null, visitor:null, paths:[], landing:null, landingAt:Infinity, exit:null, exitAt:0,
    detail:false, add:false, formStart:false, formSubmit:false, loginView:false, signup:false, login:false, post:false, contacts:0, errors:0 }; sessions.set(id, s); } return s; };
  const pageViews = {}, pageDur = {}, pageDurN = {}, sections = {}, days = {}, hours = new Array(24).fill(0), weekdays = new Array(7).fill(0);
  const searches = {}, cats = {}, cities = {}, perf = {};
  const logins = [], signups = [], posts = [], contacts = [], errorsRaw = [];
  for(const r of rows){
    const t = new Date(r.created_at).getTime();
    const s = S(r.session_id);
    if(t < s.start) s.start = t; if(t > s.end) s.end = t;
    if(r.section) s.sections.add(r.section);
    if(r.device) s.device = r.device;
    if(r.user_id) s.user_id = r.user_id;
    if(r.visitor_id) s.visitor = r.visitor_id;
    const m = r.meta || {};
    if(r.type === 'pageview'){
      s.views++; s.paths.push(r.path);
      if(m.os) s.os = m.os;
      if(t < s.landingAt){ s.landingAt = t; s.landing = r.path; }
      if(t > s.exitAt){ s.exitAt = t; s.exit = r.path; }
      pageViews[r.path] = (pageViews[r.path] || 0) + 1;
      if(r.section) sections[r.section] = (sections[r.section] || 0) + 1;
      if(t < s.sourceAt){ s.sourceAt = t; s.source = sourceLabel(r); s.campaign = r.utm_campaign || null; s.utmSource = r.utm_source || null; }
      if(isDetailPath(r.path)) s.detail = true;
      if(isAddPath(r.path)) s.add = true;
      if(isLoginPath(r.path)) s.loginView = true;
      // بحث وفلاتر الإعلانات من رابط الصفحة
      const qi = (r.path || '').indexOf('?');
      if(qi !== -1){
        const q = new URLSearchParams((r.path || '').slice(qi + 1));
        const term = (q.get('q') || '').trim(); if(term) searches[term] = (searches[term] || 0) + 1;
        if(q.get('cat')) cats[q.get('cat')] = (cats[q.get('cat')] || 0) + 1;
        if(q.get('city')) cities[q.get('city')] = (cities[q.get('city')] || 0) + 1;
      }
      if(m.load_ms){ const p = (perf[r.path] = perf[r.path] || { n:0, sum:0, list:[] }); p.n++; p.sum += m.load_ms; p.list.push(m.load_ms); }
    } else if(r.type === 'pageleave'){
      s.duration += r.duration_sec || 0;
      pageDur[r.path] = (pageDur[r.path] || 0) + (r.duration_sec || 0);
      pageDurN[r.path] = (pageDurN[r.path] || 0) + 1;
    } else if(r.type === 'login'){ logins.push(r); s.login = true; }
    else if(r.type === 'signup'){ signups.push(r); s.signup = true; }
    else if(r.type === 'post'){ posts.push(r); s.post = true; }
    else if(r.type === 'step'){
      if(m.name === 'contact'){ contacts.push(r); s.contacts++; }
      else if(m.name === 'form_start') s.formStart = true;
      else if(m.name === 'form_submit') s.formSubmit = true;
    } else if(r.type === 'error'){ errorsRaw.push(r); s.errors++; }
  }
  const list = [...sessions.values()].filter(s => s.views > 0);
  const devices = {}, os = {}, landing = {}, exit = {}, sources = {}, campaigns = {};
  for(const s of list){
    devices[s.device || 'غير معروف'] = (devices[s.device || 'غير معروف'] || 0) + 1;
    os[s.os || 'other'] = (os[s.os || 'other'] || 0) + 1;
    days[dayKey(s.start)] = (days[dayKey(s.start)] || 0) + 1;
    const d = new Date(s.start); hours[d.getHours()]++; weekdays[d.getDay()]++;
    landing[s.landing] = (landing[s.landing] || 0) + 1;
    exit[s.exit] = (exit[s.exit] || 0) + 1;
    const src = s.source || 'مباشر / محفوظ';
    sources[src] = (sources[src] || 0) + 1;
    const c = (campaigns[src] = campaigns[src] || { visits:0, dur:0, durN:0, bounce:0, signups:0, posts:0, contacts:0, formStart:0 });
    c.visits++; if(s.duration){ c.dur += s.duration; c.durN++; } if(s.views === 1) c.bounce++;
    if(s.signup) c.signups++; if(s.post) c.posts++; c.contacts += s.contacts; if(s.formStart) c.formStart++;
  }
  const withDur = list.filter(s => s.duration > 0);
  const today = dayKey(Date.now());
  // مسار التحويل لكل قسم (عدد الجلسات اللي وصلت كل خطوة)
  const funnel = {};
  for(const sec of ['ads', 'tourism', 'malaab']){
    const inSec = list.filter(s => s.sections.has(sec));
    const secPaths = (s, fn) => s.paths.some(p => sectionOfPath(p) === sec && fn(p));
    funnel[sec] = {
      visits: inSec.length,
      detail: inSec.filter(s => secPaths(s, isDetailPath)).length,
      add: inSec.filter(s => secPaths(s, isAddPath)).length,
      formStart: inSec.filter(s => s.formStart && secPaths(s, isAddPath)).length,
      formSubmit: inSec.filter(s => s.formSubmit && secPaths(s, isAddPath)).length,
      loginView: inSec.filter(s => s.loginView && secPaths(s, isAddPath)).length,
      account: inSec.filter(s => (s.signup || s.login) && secPaths(s, isAddPath)).length,
      post: inSec.filter(s => s.post && secPaths(s, isAddPath)).length,
      contacts: inSec.reduce((a, s) => a + s.contacts, 0),
    };
  }
  // أخطاء الزوار مجمّعة
  const errorsMap = {};
  for(const r of errorsRaw){
    const m = r.meta || {}; const key = (m.message || '').slice(0, 120) + '|' + (r.path || '').split('?')[0];
    const e = (errorsMap[key] = errorsMap[key] || { message: m.message || '', page: (r.path || '').split('?')[0], source: m.source, line: m.line, count:0, last:0, devices:new Set(), sessions:new Set() });
    e.count++; const t = new Date(r.created_at).getTime(); if(t > e.last) e.last = t; if(r.device) e.devices.add(r.device); e.sessions.add(r.session_id);
  }
  const perfList = Object.entries(perf).map(([path, p]) => { const sorted = p.list.slice().sort((a, b) => a - b); return { path, n:p.n, avg:Math.round(p.sum / p.n), p75: sorted[Math.floor(sorted.length * 0.75)] || sorted[sorted.length - 1] }; }).sort((a, b) => b.avg - a.avg);
  const contactItems = {};
  for(const r of contacts){ const m = r.meta || {}; const k = `${m.kind || sectionOfPath(r.path)}|${m.id || r.path}`; const c = (contactItems[k] = contactItems[k] || { kind:m.kind, id:m.id, path:r.path, section:r.section, category:m.category, city:m.city, n:0, methods:{} }); c.n++; c.methods[m.method] = (c.methods[m.method] || 0) + 1; }
  return {
    sessions: list.sort((a, b) => b.start - a.start),
    visits: list.length, visitors: new Set(list.map(s => s.visitor || s.id)).size,
    visitsToday: list.filter(s => dayKey(s.start) === today).length,
    pageviews: rows.filter(r => r.type === 'pageview').length,
    avgDuration: withDur.length ? Math.round(withDur.reduce((a, s) => a + s.duration, 0) / withDur.length) : 0,
    bounce: list.length ? Math.round(list.filter(s => s.views === 1).length / list.length * 100) : 0,
    pagesPerVisit: list.length ? (list.reduce((a, s) => a + s.views, 0) / list.length).toFixed(1) : '0',
    pages: Object.entries(pageViews).map(([path, n]) => ({ path, n, avg: pageDurN[path] ? Math.round(pageDur[path] / pageDurN[path]) : null })).sort((a, b) => b.n - a.n),
    sections, devices, os, days, hours, weekdays,
    sources: Object.entries(sources).sort((a, b) => b[1] - a[1]),
    campaigns: Object.entries(campaigns).map(([k, c]) => Object.assign({ name:k }, c, { avgDur: c.durN ? Math.round(c.dur / c.durN) : 0, bouncePct: c.visits ? Math.round(c.bounce / c.visits * 100) : 0 })).sort((a, b) => b.visits - a.visits),
    landing: Object.entries(landing).sort((a, b) => b[1] - a[1]), exit: Object.entries(exit).sort((a, b) => b[1] - a[1]),
    searches: Object.entries(searches).sort((a, b) => b[1] - a[1]), cats: Object.entries(cats).sort((a, b) => b[1] - a[1]), cities: Object.entries(cities).sort((a, b) => b[1] - a[1]),
    logins, signups, posts, contacts, contactItems: Object.values(contactItems).sort((a, b) => b.n - a.n),
    errors: Object.values(errorsMap).sort((a, b) => b.count - a.count), errorsTotal: errorsRaw.length,
    perf: perfList, funnel,
  };
}

/* ملاحظات جاهزة — قواعد بسيطة على الأرقام، بتطلع بس لمّا البيانات تكفي */
function buildInsights(st){
  const out = [];
  const add = (level, text) => out.push({ level, text });
  if(st.visits < 5){ add('info', 'البيانات لسا قليلة — الملاحظات بتصير أدق بعد عشرات الزيارات.'); return out; }
  const mobile = st.devices.mobile || 0, mobilePct = Math.round(mobile / st.visits * 100);
  if(mobilePct >= 60) add('info', `${mobilePct}% من الزوار من الجوال — أي تعديل اختبره على الجوال أولاً.`);
  if(st.bounce >= 60) add('warn', `${st.bounce}% من الزيارات غادرت من أول صفحة. أعلى صفحة هبوط: ${st.landing[0] ? st.landing[0][0].replace(/^\//, '') : '—'} — راجع هل الزائر بيلاقي فيها اللي جاي مشانه.`);
  if(st.avgDuration && st.avgDuration < 20) add('warn', `متوسط الزيارة ${formatDuration(st.avgDuration)} فقط — الزوار ما عم يلاقوا سبب يكمّلوا.`);
  for(const sec of ['ads', 'tourism', 'malaab']){
    const f = st.funnel[sec]; if(!f || f.visits < 10) continue;
    const L = SECTION_LABEL[sec];
    if(f.add === 0) add('warn', `${L}: ${f.visits} زيارة وولا زائر فتح صفحة الإضافة — زر "أضف" مو ظاهر كفاية أو الزوار جايين يتصفّحوا بس.`);
    else if(f.formStart && f.formSubmit / f.formStart < 0.5) add('warn', `${L}: ${f.formStart} بدؤوا يعبّوا النموذج و${f.formSubmit} بس ضغطوا نشر — النموذج طويل أو في حقل بيوقّفهم.`);
    else if(f.formSubmit && f.account === 0) add('warn', `${L}: ${f.formSubmit} ضغطوا نشر ووصلوا لصفحة الدخول، وولا واحد سجّل — الانسحاب عند إنشاء الحساب.`);
    else if(f.account && f.post === 0) add('warn', `${L}: ${f.account} سجّلوا حساب بعد النشر بس ما انتشر شي — تحقق من صفحة الإضافة بعد الرجوع من الدخول.`);
    if(f.detail && f.contacts === 0 && f.detail >= 10) add('info', `${L}: ${f.detail} زيارة لصفحات التفاصيل بلا أي ضغطة اتصال/واتساب — يمكن المحتوى الحالي ما بيقنع، أو أزرار التواصل مو واضحة.`);
  }
  const best = st.campaigns.filter(c => c.visits >= 5 && c.name !== 'مباشر / محفوظ');
  for(const c of best.slice(0, 3)){
    if(c.bouncePct >= 70 && !c.contacts && !c.signups) add('warn', `مصدر "${c.name}": ${c.visits} زيارة، ${c.bouncePct}% غادروا فوراً وبلا أي تواصل أو تسجيل — الجمهور أو صفحة الهبوط مو مناسبين.`);
    else if(c.contacts || c.signups) add('ok', `مصدر "${c.name}": ${c.visits} زيارة جابت ${c.contacts} تواصل و${c.signups} حساب — هاد اللي يستاهل الميزانية.`);
  }
  const slow = st.perf.filter(p => p.n >= 3 && p.avg > 3000)[0];
  if(slow) add('warn', `صفحة ${slow.path.replace(/^\//, '')} بتحمّل بمتوسط ${(slow.avg / 1000).toFixed(1)} ث — بطيئة على الزوار.`);
  if(st.errorsTotal) add('warn', `${st.errorsTotal} خطأ برمجي عند الزوار (${st.errors.length} نوع) — شوف "أخطاء وأداء".`);
  const peak = st.hours.map((v, h) => [h, v]).sort((a, b) => b[1] - a[1])[0];
  if(peak && peak[1] >= 3) add('info', `ذروة الزيارات حوالي الساعة ${peak[0]}:00 — وقت مناسب لنشر المحتوى وتشغيل الحملات.`);
  if(st.searches.length) add('info', `أكثر بحث: "${st.searches[0][0]}" (${st.searches[0][1]} مرة) — لو ما في نتائج إلها، هاد محتوى ناقص بيطلبه الزوار.`);
  return out;
}

/* ---------- عناصر عرض مشتركة ---------- */
const fmtWhen = (iso) => new Date(iso).toLocaleString('ar-SY', { dateStyle:'short', timeStyle:'short' });
const pageLabel = (p) => escapeHTML(decodeURIComponent(String(p || '')).replace(/^\//, '') || '/');
const pct = (v, total) => total ? Math.round(v / total * 100) + '%' : '0%';
const table = (head, rowsHTML, empty) => rowsHTML
  ? `<div style="overflow-x:auto;"><table class="admin-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHTML}</tbody></table></div>`
  : `<div class="admin-empty">${empty}</div>`;
const barsHTML = (items, cls) => { const max = Math.max(1, ...items.map(x => x[1])); return `<div class="stats-bars ${cls || ''}" style="grid-template-columns:repeat(${items.length},1fr);">${items.map(([label, v]) => `<div class="stats-bar" title="${escapeHTML(String(label))}: ${v}"><div class="stats-bar-fill" style="height:${Math.round(v / max * 100)}%"></div><span>${escapeHTML(String(label))}</span></div>`).join('')}</div>`; };
const insightsHTML = (list) => list.length ? `<div class="insights">${list.map(i => `<div class="insight is-${i.level}">${i.level === 'warn' ? '⚠️' : i.level === 'ok' ? '✅' : 'ℹ️'} ${escapeHTML(i.text)}</div>`).join('')}</div>` : '';

function statsToolbarHTML(extra){
  return `
    <div class="admin-toolbar">
      <div class="admin-tabs" style="margin:0;border:0;padding:0;">
        ${[[1,'اليوم'],[7,'7 أيام'],[30,'30 يوم'],[90,'90 يوم']].map(([d,l]) => `<button type="button" class="admin-tab ${d===statsDays?'active':''}" data-days="${d}">${l}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${extra || ''}<button class="btn btn-outline" id="statsRefresh">تحديث</button></div>
    </div>
    <div id="statsBody"><div class="admin-empty">جاري التحميل...</div></div>`;
}
async function statsBoot(mount, rerender, extra){
  mount.innerHTML = statsToolbarHTML(extra);
  mount.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => { statsDays = Number(b.dataset.days); rerender(); }));
  mount.querySelector('#statsRefresh').addEventListener('click', () => { statsCache = null; rerender(); });
  const body = mount.querySelector('#statsBody');
  try { return { body, st: summarizeEvents(await loadStats(statsDays)) }; }
  catch(err){
    const missing = /site_events/.test(err.message || '') && /does not exist|schema cache/.test(err.message || '');
    body.innerHTML = `<div class="admin-empty">${missing
      ? 'جدول الإحصائيات غير موجود بعد — شغّل قسم <b>site_events</b> من ملف supabase_schema.sql بـSQL Editor مرة وحدة.'
      : 'تعذّر التحميل: ' + escapeHTML(err.message || String(err))}</div>`;
    return null;
  }
}
async function userNamesFor(ids){
  const names = {}; ids = [...new Set(ids.filter(Boolean))].slice(0, 500);
  if(ids.length){ const { data } = await sb.from('profiles').select('id, name').in('id', ids); (data || []).forEach(p => { names[p.id] = p.name; }); }
  return (id) => id ? escapeHTML(names[id] || ('مستخدم ' + String(id).slice(0, 6))) : '—';
}

/* ---------- 1) الزوار ---------- */
async function renderVisitorsTab(mount){
  const r = await statsBoot(mount, () => renderVisitorsTab(mount), '<button class="btn btn-outline" id="statsExport">تصدير CSV</button>');
  if(!r) return; const { body, st } = r;
  if(!st.visits){ body.innerHTML = `<div class="admin-empty">ما في زيارات مسجّلة بهالفترة بعد.</div>`; return; }
  const userName = await userNamesFor(st.sessions.map(s => s.user_id));

  const n = Math.min(statsDays, 90); const dayList = [];
  for(let i = n - 1; i >= 0; i--){ const d = new Date(Date.now() - i * 864e5).toLocaleDateString('en-CA'); dayList.push([d.slice(5), st.days[d] || 0]); }
  const hourList = st.hours.map((v, h) => [h, v]);
  const weekList = st.weekdays.map((v, d) => [WEEKDAY[d], v]);
  const kv = (entries, total, labelFn) => entries.map(([k, v]) => `<tr><td class="cell-title">${labelFn ? labelFn(k) : escapeHTML(k)}</td><td>${v}</td><td>${pct(v, total)}</td></tr>`).join('');

  body.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num">${st.visits}</div><div class="stat-label">زيارة</div></div>
      <div class="stat-card"><div class="stat-num">${st.visitors}</div><div class="stat-label">زائر</div></div>
      <div class="stat-card"><div class="stat-num">${st.pageviews}</div><div class="stat-label">صفحة مفتوحة</div></div>
      <div class="stat-card"><div class="stat-num">${formatDuration(st.avgDuration)}</div><div class="stat-label">متوسط مدة الزيارة</div></div>
    </div>
    <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);">
      <div class="stat-card"><div class="stat-num">${st.pagesPerVisit}</div><div class="stat-label">صفحة لكل زيارة</div></div>
      <div class="stat-card"><div class="stat-num">${st.bounce}%</div><div class="stat-label">غادروا من أول صفحة</div></div>
      <div class="stat-card"><div class="stat-num">${st.signups.length + st.logins.length}</div><div class="stat-label">دخول / حساب جديد</div></div>
      <div class="stat-card"><div class="stat-num">${st.contacts.length}</div><div class="stat-label">ضغطة تواصل</div></div>
    </div>
    ${insightsHTML(buildInsights(st))}
    ${statsDays > 1 ? `<h3 class="section-heading">الزيارات يوم بيوم</h3>${barsHTML(dayList, dayList.length > 31 ? 'dense' : '')}` : ''}
    <div class="stats-cols">
      <div><h3 class="section-heading">حسب ساعة اليوم</h3>${barsHTML(hourList, 'dense-hours')}</div>
      <div><h3 class="section-heading">حسب يوم الأسبوع</h3>${barsHTML(weekList)}</div>
    </div>
    <div class="stats-cols">
      <div><h3 class="section-heading">حسب القسم</h3>${table(['القسم','صفحات','النسبة'], kv(Object.entries(st.sections).sort((a,b)=>b[1]-a[1]), st.pageviews, k => SECTION_LABEL[k] || k), 'لا بيانات')}</div>
      <div><h3 class="section-heading">الأجهزة</h3>${table(['الجهاز','زيارات','النسبة'], kv(Object.entries(st.devices).sort((a,b)=>b[1]-a[1]), st.visits, k => k === 'mobile' ? 'جوال' : k === 'desktop' ? 'حاسوب' : k), 'لا بيانات')}</div>
      <div><h3 class="section-heading">نظام التشغيل</h3>${table(['النظام','زيارات','النسبة'], kv(Object.entries(st.os).sort((a,b)=>b[1]-a[1]), st.visits, k => OS_LABEL[k] || k), 'لا بيانات')}</div>
    </div>
    <h3 class="section-heading">المصادر والحملات — شو جاب فعلاً</h3>
    ${table(['المصدر (utm / المُحيل)','زيارات','متوسط المدة','غادروا فوراً','بدؤوا نموذج','تواصل','حساب جديد','نشر'],
      st.campaigns.slice(0, 15).map(c => `<tr><td class="cell-title">${escapeHTML(c.name)}</td><td>${c.visits}</td><td>${c.avgDur ? formatDuration(c.avgDur) : '—'}</td><td>${c.bouncePct}%</td><td>${c.formStart}</td><td>${c.contacts}</td><td>${c.signups}</td><td>${c.posts}</td></tr>`).join(''), 'لا بيانات')}
    <div class="stats-cols">
      <div><h3 class="section-heading">صفحات الهبوط (أول صفحة)</h3>${table(['الصفحة','زيارات'], st.landing.slice(0, 10).map(([p, v]) => `<tr><td class="cell-title ltr">${pageLabel(p)}</td><td>${v}</td></tr>`).join(''), 'لا بيانات')}</div>
      <div><h3 class="section-heading">صفحات الخروج (آخر صفحة)</h3>${table(['الصفحة','زيارات'], st.exit.slice(0, 10).map(([p, v]) => `<tr><td class="cell-title ltr">${pageLabel(p)}</td><td>${v}</td></tr>`).join(''), 'لا بيانات')}</div>
    </div>
    <h3 class="section-heading">أكثر الصفحات فتحاً</h3>
    ${table(['الصفحة','مرات الفتح','متوسط البقاء'], st.pages.slice(0, 15).map(p => `<tr><td class="cell-title ltr">${pageLabel(p.path)}</td><td>${p.n}</td><td>${p.avg != null ? formatDuration(p.avg) : '—'}</td></tr>`).join(''), 'لا بيانات')}
    <div class="stats-cols">
      <div><h3 class="section-heading">شو بيبحثوا (الإعلانات)</h3>${table(['البحث','مرات'], st.searches.slice(0, 12).map(([k, v]) => `<tr><td class="cell-title">${escapeHTML(k)}</td><td>${v}</td></tr>`).join(''), 'ما في عمليات بحث')}</div>
      <div><h3 class="section-heading">أقسام الإعلانات المطلوبة</h3>${table(['القسم','مرات'], st.cats.slice(0, 8).map(([k, v]) => `<tr><td class="cell-title">${escapeHTML(CATEGORY_LABELS[k] || k)}</td><td>${v}</td></tr>`).join(''), 'لا بيانات')}</div>
      <div><h3 class="section-heading">المدن المطلوبة</h3>${table(['المدينة','مرات'], st.cities.slice(0, 8).map(([k, v]) => `<tr><td class="cell-title">${escapeHTML(k)}</td><td>${v}</td></tr>`).join(''), 'لا بيانات')}</div>
    </div>
    <h3 class="section-heading">آخر الزيارات</h3>
    ${table(['البداية','صفحات','المدة','القسم','المصدر','الجهاز','المستخدم','المسار'], st.sessions.slice(0, 40).map(s => `<tr>
      <td>${fmtWhen(s.start)}</td><td>${s.views}</td><td>${s.duration ? formatDuration(s.duration) : '—'}</td>
      <td>${[...s.sections].map(x => SECTION_LABEL[x] || x).join('، ') || '—'}</td>
      <td class="cell-title" style="max-width:200px;">${escapeHTML(s.source || '—')}</td>
      <td>${s.device === 'mobile' ? 'جوال' : s.device === 'desktop' ? 'حاسوب' : '—'}${s.os ? ' · ' + (OS_LABEL[s.os] || s.os) : ''}</td>
      <td>${s.user_id ? userName(s.user_id) : '<span style="color:var(--muted);">زائر</span>'}</td>
      <td class="cell-title ltr" style="max-width:260px;font-size:12px;">${s.paths.slice(0, 4).map(pageLabel).join(' → ')}${s.paths.length > 4 ? ' …' : ''}${s.contacts ? ` <b>☎${s.contacts}</b>` : ''}</td>
    </tr>`).join(''), 'لا زيارات')}
    <div class="admin-toolbar" style="margin-top:18px;">
      <p class="admin-hint" style="margin:0;">من جدول site_events (بلا IP ولا بيانات شخصية). مدة الزيارة = الوقت اللي كانت فيه الصفحة ظاهرة فعلاً.</p>
      <button class="btn btn-outline" id="statsPurge">حذف السجلات الأقدم من 90 يوم</button>
    </div>`;
  body.querySelector('#statsPurge').addEventListener('click', async () => {
    if(!confirm('حذف كل سجلات الزيارات الأقدم من 90 يوم؟ ما بتنرجع.')) return;
    const { error } = await sb.from('site_events').delete().lt('created_at', new Date(Date.now() - 90 * 864e5).toISOString());
    if(error){ alert('تعذّر الحذف: ' + error.message); return; }
    toast('تم حذف السجلات القديمة');
  });
  mount.querySelector('#statsExport').addEventListener('click', () => {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [['البداية','صفحات','المدة بالثواني','الأقسام','المصدر','الحملة','الجهاز','النظام','مستخدم','تواصل','هبوط','خروج','المسار'].map(esc).join(',')];
    for(const s of st.sessions) lines.push([new Date(s.start).toISOString(), s.views, s.duration, [...s.sections].join(' '), s.source, s.campaign || '', s.device, s.os, s.user_id ? 'نعم' : '', s.contacts, s.landing, s.exit, s.paths.join(' > ')].map(esc).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type:'text/csv;charset=utf-8' }));
    a.download = `saaha-visits-${statsDays}d-${dayKey(Date.now())}.csv`; a.click(); URL.revokeObjectURL(a.href);
  });
}

/* ---------- 2) مسار التحويل ---------- */
let funnelSection = 'ads';
async function renderFunnelTab(mount){
  const r = await statsBoot(mount, () => renderFunnelTab(mount));
  if(!r) return; const { body, st } = r;
  const f = st.funnel[funnelSection];
  const STEPS = {
    ads:     [['visits','زار قسم الإعلانات'], ['detail','فتح إعلان'], ['add','فتح صفحة "أضف إعلانك"'], ['formStart','بدأ يكتب بالنموذج'], ['formSubmit','ضغط "نشر الإعلان"'], ['loginView','وصل لصفحة الدخول'], ['account','سجّل حساب / دخل'], ['post','نشر إعلان']],
    tourism: [['visits','زار قسم السياحة'], ['detail','فتح صفحة مكان'], ['add','فتح "أضف مكان"'], ['formStart','بدأ يكتب بالنموذج'], ['formSubmit','ضغط إرسال'], ['loginView','وصل لصفحة الدخول'], ['account','سجّل حساب / دخل'], ['post','أضاف مكاناً']],
    malaab:  [['visits','زار ملعبك'], ['detail','فتح صفحة تفاصيل'], ['add','فتح صفحة إضافة'], ['formStart','بدأ يكتب بالنموذج'], ['formSubmit','ضغط إرسال'], ['loginView','وصل لصفحة الدخول/التسجيل'], ['account','سجّل حساب / دخل'], ['post','أضاف محتوى']],
  }[funnelSection];
  let prev = null;
  const stepsHTML = STEPS.map(([k, label]) => {
    const v = f[k]; const ofPrev = prev ? pct(v, prev) : '100%'; const ofAll = pct(v, f.visits);
    const width = f.visits ? Math.max(2, Math.round(v / f.visits * 100)) : 0;
    const drop = prev != null && prev > 0 ? prev - v : 0;
    const html = `
      <div class="funnel-step">
        <div class="funnel-label"><b>${label}</b><span class="mod-meta">${v} زيارة · ${ofAll} من الكل${prev != null ? ` · ${ofPrev} من الخطوة السابقة` : ''}</span></div>
        <div class="funnel-bar"><div class="funnel-fill" style="width:${width}%"></div></div>
        ${drop > 0 && prev >= 3 ? `<div class="funnel-drop">⬇ ${drop} انسحبوا هون (${pct(drop, prev)})</div>` : ''}
      </div>`;
    prev = v; return html;
  }).join('');
  const contactBySec = {}, contactByMethod = {};
  for(const c of st.contacts){ const m = c.meta || {}; contactBySec[c.section || '—'] = (contactBySec[c.section || '—'] || 0) + 1; contactByMethod[m.method || '—'] = (contactByMethod[m.method || '—'] || 0) + 1; }
  const itemLink = (c) => { const p = c.path && !c.path.includes('?') && c.id ? c.path + '?id=' + encodeURIComponent(c.id) : c.path; return `<a href="${escapeHTML((p || '').replace(/^\//, ''))}" target="_blank" rel="noopener">${pageLabel(p)}</a>`; };
  body.innerHTML = `
    <div class="admin-tabs">${['ads','tourism','malaab'].map(s => `<button type="button" class="admin-tab ${s===funnelSection?'active':''}" data-sec="${s}">${SECTION_LABEL[s]}<span class="admin-tab-count">${st.funnel[s].visits}</span></button>`).join('')}</div>
    ${insightsHTML(buildInsights(st).filter(i => i.text.startsWith(SECTION_LABEL[funnelSection]) || /مصدر|بحث/.test(i.text)))}
    <h3 class="section-heading">من الزيارة للنشر — وين بيوقف الزوار</h3>
    <div class="funnel">${f.visits ? stepsHTML : '<div class="admin-empty">ما في زيارات لهالقسم بهالفترة.</div>'}</div>
    <p class="admin-hint">كل خطوة = عدد الزيارات (الجلسات) اللي وصلتها. "بدأ يكتب" و"ضغط نشر" بتنسجّل تلقائياً من نماذج الإضافة.</p>
    <h3 class="section-heading">نية التواصل — ضغطات اتصال / واتساب / اتجاهات</h3>
    <div class="stats-cols">
      <div>${table(['القسم','ضغطات'], Object.entries(contactBySec).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `<tr><td class="cell-title">${SECTION_LABEL[k] || k}</td><td>${v}</td></tr>`).join(''), 'ما في ضغطات تواصل بهالفترة')}</div>
      <div>${table(['الطريقة','ضغطات'], Object.entries(contactByMethod).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `<tr><td class="cell-title">${CONTACT_LABEL[k] || k}</td><td>${v}</td></tr>`).join(''), 'ما في ضغطات تواصل بهالفترة')}</div>
    </div>
    <h3 class="section-heading">أكثر المحتوى اللي جاب تواصل</h3>
    ${table(['المحتوى','القسم','التصنيف','المدينة','ضغطات','الطرق'], st.contactItems.slice(0, 15).map(c => `<tr><td class="cell-title">${itemLink(c)}</td><td>${SECTION_LABEL[c.section] || c.section || '—'}</td><td>${escapeHTML(c.category || '—')}</td><td>${escapeHTML(c.city || '—')}</td><td>${c.n}</td><td>${Object.entries(c.methods).map(([m, n]) => `${CONTACT_LABEL[m] || m} ${n}`).join('، ')}</td></tr>`).join(''), 'ما في بيانات بعد')}`;
  body.querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', () => { funnelSection = b.dataset.sec; renderFunnelTab(mount); }));
}

/* ---------- 3) أخطاء وأداء ---------- */
async function renderQualityTab(mount){
  const r = await statsBoot(mount, () => renderQualityTab(mount));
  if(!r) return; const { body, st } = r;
  const slowest = st.perf.slice(0, 15);
  const allLoads = st.perf.reduce((a, p) => a + p.avg * p.n, 0), allN = st.perf.reduce((a, p) => a + p.n, 0);
  body.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num">${st.errorsTotal}</div><div class="stat-label">خطأ عند الزوار</div></div>
      <div class="stat-card"><div class="stat-num">${st.errors.length}</div><div class="stat-label">نوع خطأ مختلف</div></div>
      <div class="stat-card"><div class="stat-num">${allN ? (allLoads / allN / 1000).toFixed(1) + ' ث' : '—'}</div><div class="stat-label">متوسط تحميل الصفحة</div></div>
      <div class="stat-card"><div class="stat-num">${st.perf.filter(p => p.n >= 3 && p.avg > 3000).length}</div><div class="stat-label">صفحات بطيئة (>3 ث)</div></div>
    </div>
    ${insightsHTML(buildInsights(st).filter(i => /خطأ|بطيئة/.test(i.text)))}
    <h3 class="section-heading">أخطاء برمجية صارت عند الزوار فعلاً</h3>
    ${table(['الخطأ','الصفحة','المصدر','مرات','زوار','آخر مرة','الأجهزة'], st.errors.slice(0, 30).map(e => `<tr>
      <td class="cell-title" style="max-width:360px;white-space:normal;direction:ltr;text-align:end;font-size:12px;">${escapeHTML(e.message)}</td>
      <td class="ltr">${pageLabel(e.page)}</td><td class="ltr" style="font-size:12px;">${escapeHTML((e.source || '') + (e.line ? ':' + e.line : ''))}</td>
      <td>${e.count}</td><td>${e.sessions.size}</td><td>${fmtWhen(e.last)}</td><td>${[...e.devices].map(d => d === 'mobile' ? 'جوال' : 'حاسوب').join('، ')}</td></tr>`).join(''), '✅ ما في أخطاء مسجّلة عند الزوار بهالفترة')}
    <h3 class="section-heading">سرعة الصفحات (كما حمّلت عند الزوار)</h3>
    ${table(['الصفحة','قياسات','متوسط التحميل','75% من الزوار خلال'], slowest.map(p => `<tr><td class="cell-title ltr">${pageLabel(p.path)}</td><td>${p.n}</td><td ${p.avg > 3000 ? 'style="color:var(--danger);font-weight:700;"' : ''}>${(p.avg / 1000).toFixed(1)} ث</td><td>${(p.p75 / 1000).toFixed(1)} ث</td></tr>`).join(''), 'ما في قياسات بعد')}
    <p class="admin-hint">التحميل = من طلب الصفحة لاكتمالها بمتصفّح الزائر (شبكته وجهازه محسوبين) — الأرقام الحقيقية اللي بيحسّها الناس، مو قياس مخبري.</p>`;
}

/* ---------------- Comments tab ---------------- */
function renderCommentsTab(mount){
  _commentsCache = null;   // قراءة جديدة كل ما ينفتح التبويب؛ البحث بيفلتر بالذاكرة
  mount.innerHTML = `
    <div class="admin-toolbar">
      <input type="search" class="admin-search" id="commentSearch" placeholder="ابحث في نص التعليق أو الاسم أو عنوان الإعلان...">
    </div>
    <div id="commentsTableWrap"></div>`;
  document.getElementById('commentSearch').addEventListener('input', () => renderCommentsTable());
  renderCommentsTable();
}
let _commentsCache = null;
async function renderCommentsTable(){
  if(!_commentsCache) _commentsCache = await getAllCommentsFlat();
  const q = (document.getElementById('commentSearch')?.value || '').trim().toLowerCase();
  const list = q ? _commentsCache.filter(c => [c.text, c.name, c.adTitle].some(v => (v||'').toLowerCase().includes(q))) : _commentsCache;
  const wrap = document.getElementById('commentsTableWrap');
  if(!list.length){ wrap.innerHTML = `<div class="admin-empty">${q ? 'لا نتائج مطابقة' : 'لا توجد تعليقات بعد'}</div>`; return; }
  wrap.innerHTML = `
  <p class="admin-count">${list.length} تعليق</p>
  <table class="admin-table">
    <thead><tr><th>الإعلان</th><th>الاسم</th><th>التعليق</th><th>الوقت</th><th></th></tr></thead>
    <tbody>
      ${list.map(c=>`
        <tr data-id="${c.id}">
          <td class="cell-title"><a href="listing.html?id=${c.adId}" target="_blank" rel="noopener" title="فتح الإعلان على الموقع">${escapeHTML(c.adTitle || '(إعلان محذوف)')}</a></td>
          <td>${escapeHTML(c.name)}</td>
          <td class="cell-title" style="max-width:320px;white-space:normal;">${escapeHTML(c.text)}</td>
          <td>${escapeHTML(c.time)}</td>
          <td><button class="admin-icon-btn danger delete-comment-btn" title="حذف نهائي" aria-label="حذف التعليق نهائياً">${ADMIN_ICONS.trash}</button></td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
  wrap.querySelectorAll('.delete-comment-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const tr = btn.closest('tr');
      if(confirm('حذف هذا التعليق نهائياً؟')){
        try{
          await deleteComment(tr.dataset.id);
          toast('تم حذف التعليق');
          _commentsCache = _commentsCache.filter(c => c.id !== tr.dataset.id);
          renderCommentsTable();
        }catch(e){
          console.error('admin delete comment failed:', e);
          toast('تعذّر حذف التعليق، تحقق من اتصالك بالإنترنت', 'error');
        }
      }
    });
  });
}

/* ---------------- Settings tab ---------------- */
function renderSettingsTab(mount){
  mount.innerHTML = `
    <div class="panel settings-card">
      <h3 class="panel-title">تعديل بيانات الدخول</h3>
      <form id="settingsForm">
        <div class="field full"><label>البريد الإلكتروني الجديد</label><input type="email" id="sEmail" value="${escapeHTML((adminUser && adminUser.email)||'')}" required></div>
        <div class="field full"><label>كلمة المرور الجديدة</label><input type="password" id="sNewPass" placeholder="اتركها فارغة إن لم ترغب بالتغيير" minlength="6"></div>
        <button type="submit" class="btn btn-primary btn-lg">حفظ التغييرات</button>
      </form>
    </div>
  `;
  document.getElementById('settingsForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const newEmail = document.getElementById('sEmail').value.trim();
    const newPass = document.getElementById('sNewPass').value;
    try{
      if(newEmail !== adminUser.email) await updateAccountEmail(newEmail);
      if(newPass) await updateAccountPassword(newPass);
      adminUser = await getCurrentUser();
      toast('تم تحديث بيانات الدخول بنجاح');
      document.getElementById('sNewPass').value = '';
      renderTopbar();
    }catch(err){
      toast(err.message || 'تعذّر تحديث بيانات الدخول', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', initAdmin);

/* =========================================================
   المحتوى الخاضع للإشراف — السياحة + أنواع ملعبك السبعة
   عرض واحد لكل نوع بثلاث حالات: بانتظار المراجعة / منشور على الموقع / مرفوض،
   ونفس الأزرار بكل مكان: موافقة ونشر · رفض · إخفاء وإرجاع للمراجعة · حذف نهائي.
   كل قرار بيمرّ بـRLS (المشرف بس)، ومنتحقق إن الصف تغيّر فعلاً — تحديث بلا
   صلاحية بـPostgREST بيرجع "نجاح" بصفر صفوف، فما منعتمد على غياب الخطأ.
   ========================================================= */
const TOURISM_CAT = { landmark:'معلم أثري', restaurant:'مطعم', food:'مطعم', cafe:'مقهى', garden:'حديقة', shop:'متجر', other:'أخرى' };
const CONTENT = {
  tourism: { table:'tourism_places', label:'الأماكن السياحية', one:'المكان', reviewCols:true, ytField:true, editable:true,
    title:r=>r.name, image:r=>(r.images&&r.images[0])||'',
    meta:r=>`${TOURISM_CAT[r.category]||r.category||''} · ${r.region||''} - ${r.city||''}`,
    page:r=>`tourism/place.html?id=${r.id}` },
  venues: { table:'malaabak_venues', label:'الملاعب', one:'الملعب', reviewCols:true, ytField:true,
    title:r=>r.name, image:r=>(r.images&&r.images[0])||r.image||'',
    meta:r=>`${r.sport||''} · ${r.governorate||''} - ${r.city||''}`, page:r=>`malaab/venue-detail.html?id=${r.id}` },
  coaches: { table:'malaabak_coaches', label:'المدربون', one:'المدرب', reviewCols:true, ytField:true,
    title:r=>r.name, image:r=>r.image||'',
    meta:r=>`${r.specialty||''} · ${r.governorate||''} - ${r.city||''}`, page:r=>`malaab/coach-detail.html?id=${r.id}` },
  academies: { table:'malaabak_academies', label:'الأكاديميات', one:'الأكاديمية', reviewCols:true, ytField:true,
    title:r=>r.name, image:r=>r.image||'',
    meta:r=>`${(r.sports||[]).join('، ')} · ${r.governorate||''} - ${r.city||''}`, page:r=>`malaab/academy-detail.html?id=${r.id}` },
  talents: { table:'malaabak_talents', label:'المواهب', one:'الموهبة', reviewCols:true, videos:true,
    title:r=>r.name, image:r=>r.image||'',
    meta:r=>`${r.sport||''} · ${r.position||''} · ${r.age||'?'} سنة · ${r.governorate||''}`, page:r=>`malaab/talent-detail.html?id=${r.id}` },
  // المباريات/التمارين/الفعاليات بتنشر فوراً (بلا مراجعة) وما عندها أعمدة reviewed_*؛
  // "بانتظار المراجعة" هون معناها: أخفاها المشرف عن الموقع لحد ما يقرّر.
  matches: { table:'malaabak_matches', label:'المباريات', one:'المباراة', reviewCols:false,
    title:r=>r.title, image:r=>r.image||'',
    meta:r=>`${r.sport||''} · ${r.venue_name||''} · ${r.day||''} ${r.time||''} · ${r.governorate||''}`, page:r=>`malaab/match-detail.html?id=${r.id}` },
  trainings: { table:'malaabak_trainings', label:'التمارين', one:'التمرين', reviewCols:false,
    title:r=>r.title, image:r=>r.image||'',
    meta:r=>`${r.type||''} · ${r.coach||''} · ${r.day||''} ${r.time||''} · ${r.governorate||''}`, page:r=>`malaab/training-detail.html?id=${r.id}` },
  events: { table:'malaabak_events', label:'الفعاليات', one:'الفعالية', reviewCols:false,
    title:r=>r.title, image:r=>r.image||'',
    meta:r=>`${r.type||''} · ${r.venue_name||''} · ${r.day||''} ${r.date_label||''} · ${r.governorate||''}`, page:r=>`malaab/event-detail.html?id=${r.id}` },
};
const STATUS_TABS = [
  { key:'pending',  label:'بانتظار المراجعة' },
  { key:'approved', label:'منشور على الموقع' },
  { key:'rejected', label:'مرفوض' },
];
// الحالة المختارة لكل نوع بتضل محفوظة طول الجلسة (رجعة للتبويب بترجّعك لنفس القائمة)
const modState = {};

// تحديث الحالة مع التأكد إن صف واحد تغيّر فعلاً
async function setContentStatus(C, id, status, extra){
  const patch = Object.assign({ status }, extra || {});
  if(C.reviewCols){ patch.reviewed_by = adminUser.id; patch.reviewed_at = new Date().toISOString(); }
  const { data, error } = await sb.from(C.table).update(patch).eq('id', id).select('id');
  if(error) throw error;
  if(!data || !data.length) throw new Error('ما تغيّر شي — يمكن الصلاحيات ناقصة أو العنصر انحذف');
}

// حذف نهائي: الصف + (قدر الإمكان) صوره وفيديوهاته من التخزين
async function deleteContent(C, r){
  const { data, error } = await sb.from(C.table).delete().eq('id', r.id).select('id');
  if(error) throw error;
  if(!data || !data.length) throw new Error('ما انحذف — يمكن الصلاحيات ناقصة (RLS) أو العنصر محذوف أصلاً');
  const urls = [].concat(r.images || [], r.image || [], (r.videos || []).map(v => v && v.videoUrl))
    .filter(u => typeof u === 'string' && u.includes('/' + MEDIA_BUCKET + '/'));
  for(const u of urls){ MalaabakAPI.deleteFile(u); }   // best-effort — لو فشل ما منوقف
}

const STATUS_ACTIONS = {
  pending:  [ ['approve','موافقة ونشر','btn-primary'], ['reject','رفض','btn-danger'] ],
  approved: [ ['unpublish','إخفاء وإرجاع للمراجعة','btn-outline'], ['reject','رفض','btn-danger'] ],
  rejected: [ ['approve','موافقة ونشر','btn-primary'], ['unpublish','إرجاع للمراجعة','btn-outline'] ],
};
const ACTION_STATUS = { approve:'approved', reject:'rejected', unpublish:'pending' };
const ACTION_DONE   = { approve:'تمت الموافقة والنشر', reject:'تم الرفض', unpublish:'انخفى عن الموقع ورجع للمراجعة' };

function modCardHTML(C, r, status){
  const image = C.image(r);
  const imgHTML = /^https?:\/\//.test(String(image))
    ? `<img class="mod-img" src="${escapeHTML(image)}" alt="">`
    : `<div class="mod-img mod-img-emoji">${escapeHTML(String(image||'📄'))}</div>`;
  const when = new Date(r.created_at).toLocaleDateString('ar');
  const reviewed = r.reviewed_at ? ` · آخر قرار ${new Date(r.reviewed_at).toLocaleDateString('ar')}` : '';
  const desc = r.description ? `<div class="mod-desc">${escapeHTML(String(r.description)).slice(0,160)}</div>` : '';
  const yt = C.ytField ? `
    <div class="mod-yt">
      <label>رابط يوتيوب (اختياري)</label>
      <div class="mod-yt-row">
        <input type="url" class="mod-yt-input" data-id="${r.id}" value="${escapeHTML(r.video_url||'')}" placeholder="https://youtube.com/watch?v=...">
        <button type="button" class="btn btn-outline mod-act" data-act="saveyt" data-id="${r.id}">حفظ الرابط</button>
      </div>
      ${r.video_url ? '<p class="mod-hint">✓ فيديو محفوظ حالياً</p>' : ''}
    </div>` : '';
  const videos = C.videos ? talentVideosHTML(r) : '';
  const btn = (act, label, cls) => `<button type="button" class="btn ${cls} mod-act" data-act="${act}" data-id="${r.id}">${label}</button>`;
  const actions = [ btn('details','👁 كل التفاصيل','btn-outline') ];
  if(status === 'approved') actions.push(`<a class="btn btn-outline" href="${C.page(r)}" target="_blank" rel="noopener">فتح على الموقع</a>`);
  if(C.editable) actions.push(btn('edit','تعديل','btn-outline'));
  STATUS_ACTIONS[status].forEach(([act,label,cls]) => actions.push(btn(act,label,cls)));
  actions.push(btn('delete','حذف نهائي','btn-danger-outline'));
  return `
    <div class="admin-card mod-card" data-id="${r.id}">
      ${imgHTML}
      <div class="mod-body">
        <div class="mod-title">${escapeHTML(C.title(r)||'(بلا اسم)')}</div>
        <div class="mod-meta">${escapeHTML(C.meta(r))}</div>
        <div class="mod-meta">أُضيف ${when}${reviewed}</div>
        ${desc}${yt}${videos}
      </div>
      <div class="mod-actions">${actions.join('')}</div>
    </div>`;
}

// المواهب: لكل فيديو حقل رابط يوتيوب — الموافقة بتخزّن الروابط وبتحذف ملفات Supabase اللي صار إلها بديل
function talentVideosHTML(r){
  if(!r.videos || !r.videos.length) return '';
  return '<div class="mod-videos">' + r.videos.map((v,i)=>{
    const isYt = MalaabakAPI.isYouTubeUrl(v.videoUrl);
    const fileUrl = !isYt && v.videoUrl ? v.videoUrl : '';
    return `
      <div class="mod-video" data-idx="${i}">
        <div class="mod-video-title">🎬 ${escapeHTML(v.title || `فيديو ${i+1}`)}</div>
        ${fileUrl ? `<div class="mod-hint"><a href="${escapeHTML(fileUrl)}" target="_blank" download>⬇ حمّل الملف الأصلي</a> ← ارفعه على يوتيوب @saahasyria (unlisted) والصق الرابط تحت</div>` : ''}
        ${isYt ? `<div class="mod-hint is-ok">✓ يوتيوب: ${escapeHTML(v.videoUrl)}</div>` : ''}
        <input type="url" class="mod-yt-video" data-id="${r.id}" data-idx="${i}" value="${escapeHTML(isYt ? v.videoUrl : '')}" placeholder="https://youtube.com/watch?v=...">
      </div>`;
  }).join('') + '<p class="mod-hint">الموافقة بلا رابط يوتيوب رح تنشر ملف Supabase متل ما هو.</p></div>';
}

// قبل موافقة موهبة: خزّن روابط يوتيوب اللي كتبها المشرف واحذف الملفات الأصلية اللي صار إلها بديل
async function talentApprovePrep(r, card){
  if(!r.videos || !r.videos.length) return;
  const inputs = card.querySelectorAll('.mod-yt-video');
  const filesToDelete = [];
  const newVideos = r.videos.map((v,i)=>{
    const inp = inputs[i]; if(!inp) return v;
    const raw = inp.value.trim();
    if(raw && MalaabakAPI.isYouTubeUrl(raw)){
      if(v.videoUrl && !MalaabakAPI.isYouTubeUrl(v.videoUrl)) filesToDelete.push(v.videoUrl);
      return Object.assign({}, v, { videoUrl: raw, source:'youtube' });
    }
    return v;
  });
  await MalaabakAPI.update('talents', r.id, { videos: newVideos });
  for(const url of filesToDelete){ MalaabakAPI.deleteFile(url); }
}

async function renderModeration(mount, key){
  const C = CONTENT[key];
  if(!C){ mount.innerHTML = `<div class="admin-empty">قسم غير معروف.</div>`; return; }
  const status = modState[key] || (C.reviewCols ? 'pending' : 'approved');
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';

  const res = await sb.from(C.table).select('*').eq('status', status).order('created_at', { ascending:false }).limit(300);
  if(res.error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(res.error.message)}</div>`; return; }
  const rows = res.data || [];
  const cache = new Map(rows.map(r => [r.id, r]));
  const counts = contentCounts[key] || { pending:0, approved:0, rejected:0 };

  const EMPTY = {
    pending:  `✅ ما في ${C.label} بانتظار المراجعة.`,
    approved: `ما في ${C.label} منشورة حالياً.`,
    rejected: `ما في ${C.label} مرفوضة.`,
  };
  mount.innerHTML = `
    <div class="admin-tabs">
      ${STATUS_TABS.map(t => `<button type="button" class="admin-tab ${t.key===status?'active':''}" data-status="${t.key}">${t.label}<span class="admin-tab-count">${counts[t.key] || 0}</span></button>`).join('')}
    </div>
    <div class="admin-toolbar">
      <input type="search" class="admin-search" id="modSearch" placeholder="ابحث بالاسم أو المدينة أو المحافظة...">
    </div>
    <div id="modList"></div>`;
  const list = mount.querySelector('#modList');

  const draw = () => {
    const q = mount.querySelector('#modSearch').value.trim().toLowerCase();
    const filtered = q ? rows.filter(r => [C.title(r), C.meta(r), r.description].some(v => String(v||'').toLowerCase().includes(q))) : rows;
    list.innerHTML = filtered.length
      ? `<p class="admin-count">${filtered.length} من ${C.label}</p>` + filtered.map(r => modCardHTML(C, r, status)).join('')
      : `<div class="admin-empty">${q ? 'لا نتائج مطابقة.' : EMPTY[status]}</div>`;
  };
  draw();
  mount.querySelector('#modSearch').addEventListener('input', draw);
  mount.querySelectorAll('.admin-tab').forEach(b => b.addEventListener('click', () => { modState[key] = b.dataset.status; renderModeration(mount, key); }));

  // بعد أي قرار: شيل البطاقة من القائمة الحالية وحدّث العدّادات (بلا إعادة تحميل كاملة)
  const removeCard = async (id) => {
    const i = rows.findIndex(r => r.id === id); if(i !== -1) rows.splice(i, 1);
    cache.delete(id);
    draw();
    await refreshCountsAndSidebar();
    mount.querySelectorAll('.admin-tab').forEach(b => { b.querySelector('.admin-tab-count').textContent = (contentCounts[key] || {})[b.dataset.status] || 0; });
  };

  // ملاحظة: المستمع على #modList (بينحذف مع كل إعادة رسم) مو على mount — وإلا بيتراكموا
  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('.mod-act'); if(!btn) return;
    const act = btn.dataset.act, id = btn.dataset.id, r = cache.get(id);
    if(!r) return;
    const card = btn.closest('.mod-card');
    const original = btn.textContent;
    const busy = (on) => { btn.disabled = on; btn.textContent = on ? '...' : original; };

    if(act === 'details'){
      const canApprove = status !== 'approved', canReject = status !== 'rejected';
      openReviewModal(r, {
        title: `مراجعة كاملة — ${C.one}: ${C.title(r) || ''}`,
        onApprove: canApprove ? async () => { await setContentStatus(C, id, 'approved'); toast(ACTION_DONE.approve); await removeCard(id); } : undefined,
        onReject:  canReject  ? async () => { await setContentStatus(C, id, 'rejected'); toast(ACTION_DONE.reject);  await removeCard(id); } : undefined,
      });
      return;
    }
    if(act === 'edit'){ openTourismEditModal(r, (patched) => { Object.assign(r, patched); draw(); }); return; }

    if(act === 'saveyt'){
      const raw = card.querySelector('.mod-yt-input').value.trim();
      if(raw && !MalaabakAPI.isYouTubeUrl(raw)){ alert('رابط اليوتيوب مو صحيح. صحّحه أو فرّغه.'); return; }
      busy(true);
      try {
        const { data, error } = await sb.from(C.table).update({ video_url: raw || null }).eq('id', id).select('id');
        if(error) throw error;
        if(!data || !data.length) throw new Error('ما تغيّر شي — يمكن الصلاحيات ناقصة');
        r.video_url = raw || null; toast('تم حفظ رابط الفيديو'); draw();
      } catch(err){ alert('تعذّر الحفظ: ' + (err.message || err)); busy(false); }
      return;
    }

    if(act === 'delete'){
      const msg = `حذف ${C.one} "${C.title(r) || ''}" نهائياً؟\n` +
        (status === 'approved' ? 'هو منشور على الموقع حالياً ورح يختفي فوراً.\n' : '') +
        'رح تنحذف صوره وفيديوهاته كمان. هالعملية ما بتنرجع.';
      if(!confirm(msg)) return;
      busy(true);
      try { await deleteContent(C, r); toast('تم الحذف نهائياً'); await removeCard(id); }
      catch(err){ alert('تعذّر الحذف: ' + (err.message || err)); busy(false); }
      return;
    }

    const next = ACTION_STATUS[act]; if(!next) return;
    busy(true);
    try {
      const extra = {};
      // الموافقة بتخزّن رابط اليوتيوب المكتوب بنفس التحديث (متل قبل)
      if(act === 'approve' && C.ytField){
        const raw = card.querySelector('.mod-yt-input').value.trim();
        if(raw && !MalaabakAPI.isYouTubeUrl(raw)){ alert('رابط اليوتيوب مو صحيح. صحّحه أو فرّغه قبل الموافقة.'); busy(false); return; }
        extra.video_url = raw || null;
      }
      if(act === 'approve' && C.videos) await talentApprovePrep(r, card);
      await setContentStatus(C, id, next, extra);
      toast(ACTION_DONE[act]);
      await removeCard(id);
    } catch(err){ alert('تعذّر الحفظ: ' + (err.message || err)); busy(false); }
  });
}

/* تعديل بيانات مكان سياحي (المشرف بس) — الأساسيات اللي بتظهر على الصفحة */
function openTourismEditModal(r, onSaved){
  const catOptions = Object.entries(TOURISM_CAT).filter(([k]) => k !== 'food')
    .map(([k,v]) => `<option value="${k}" ${k===r.category?'selected':''}>${escapeHTML(v)}</option>`).join('');
  document.getElementById('modalTitle').textContent = 'تعديل المكان: ' + (r.name || '');
  document.getElementById('modalBody').innerHTML = `
    <div class="field full"><label>الاسم</label><input type="text" id="teName" value="${escapeHTML(r.name||'')}"></div>
    <div class="form-grid">
      <div class="field"><label>النوع</label><select id="teCategory">${catOptions}</select></div>
      <div class="field"><label>المحافظة</label><input type="text" id="teRegion" value="${escapeHTML(r.region||'')}"></div>
      <div class="field"><label>المدينة</label><input type="text" id="teCity" value="${escapeHTML(r.city||'')}"></div>
      <div class="field"><label>العنوان</label><input type="text" id="teAddress" value="${escapeHTML(r.address||'')}"></div>
    </div>
    <div class="field full"><label>الوصف</label><textarea id="teDesc">${escapeHTML(r.description||'')}</textarea></div>
    <div class="form-grid">
      <div class="field"><label>خط العرض (lat)</label><input type="number" step="any" id="teLat" value="${r.lat ?? ''}"></div>
      <div class="field"><label>خط الطول (lng)</label><input type="number" step="any" id="teLng" value="${r.lng ?? ''}"></div>
    </div>
    <div class="field full"><label>رابط يوتيوب (اختياري)</label><input type="url" id="teVideo" value="${escapeHTML(r.video_url||'')}" placeholder="https://youtube.com/watch?v=..."></div>
    <div class="form-actions">
      <button type="button" class="btn btn-primary btn-lg" id="teSaveBtn">حفظ التعديلات</button>
      <button type="button" class="btn btn-outline btn-lg" id="teCancelBtn">إلغاء</button>
    </div>`;
  document.getElementById('teCancelBtn').addEventListener('click', closeAdModal);
  document.getElementById('teSaveBtn').addEventListener('click', async () => {
    const v = (id) => document.getElementById(id).value.trim();
    const patch = { name:v('teName'), category:v('teCategory'), region:v('teRegion')||null, city:v('teCity'), address:v('teAddress')||null,
      description:v('teDesc')||null, lat:v('teLat')===''?null:Number(v('teLat')), lng:v('teLng')===''?null:Number(v('teLng')), video_url:v('teVideo')||null };
    if(!patch.name || !patch.city){ toast('الاسم والمدينة مطلوبان', 'error'); return; }
    if(patch.video_url && !MalaabakAPI.isYouTubeUrl(patch.video_url)){ toast('رابط اليوتيوب مو صحيح', 'error'); return; }
    try {
      const { data, error } = await sb.from('tourism_places').update(patch).eq('id', r.id).select('id');
      if(error) throw error;
      if(!data || !data.length) throw new Error('ما تغيّر شي — يمكن الصلاحيات ناقصة');
    } catch(err){ toast('تعذّر الحفظ: ' + (err.message || err), 'error'); return; }
    closeAdModal(); toast('تم حفظ التعديلات'); onSaved(patch);
  });
  document.getElementById('adModal').classList.add('open');
}

/* =========================================================
   أسماء العناصر المستهدفة — التقييمات والحجوزات بتخزّن target_type + target_id بس،
   فمنجيب الأسماء دفعة وحدة لكل نوع حتى المشرف يشوف "على ملعب: النجوم" مو معرّف.
   ========================================================= */
const TARGET_TABLES = { venue:'malaabak_venues', coach:'malaabak_coaches', academy:'malaabak_academies', match:'malaabak_matches', training:'malaabak_trainings', event:'malaabak_events' };
const TARGET_PAGES  = { venue:'malaab/venue-detail.html', coach:'malaab/coach-detail.html', academy:'malaab/academy-detail.html', match:'malaab/match-detail.html', training:'malaab/training-detail.html', event:'malaab/event-detail.html' };
const TARGET_LABEL  = { venue:'ملعب', coach:'مدرب', academy:'أكاديمية', match:'مباراة', training:'تمرين', event:'فعالية' };
async function fetchTargetNames(rows){
  const byType = {};
  rows.forEach(r => { if(TARGET_TABLES[r.target_type]) (byType[r.target_type] = byType[r.target_type] || new Set()).add(r.target_id); });
  const names = {};
  await Promise.all(Object.entries(byType).map(async ([type, ids]) => {
    const col = ['match','training','event'].includes(type) ? 'title' : 'name';
    const { data } = await sb.from(TARGET_TABLES[type]).select(`id, ${col}`).in('id', [...ids]);
    (data || []).forEach(x => { names[type + ':' + x.id] = x[col]; });
  }));
  return names;
}
function targetLinkHTML(r, names){
  const label = TARGET_LABEL[r.target_type] || r.target_type;
  const name = names[r.target_type + ':' + r.target_id];
  const page = TARGET_PAGES[r.target_type];
  if(!name) return `${escapeHTML(label)}: <span class="mod-hint">(محذوف)</span>`;
  return `${escapeHTML(label)}: <a href="${page}?id=${encodeURIComponent(r.target_id)}" target="_blank" rel="noopener"><b>${escapeHTML(name)}</b></a>`;
}

/* =========================================================
   السياحة — التعليقات (tourism_reviews)
   ========================================================= */
async function renderTourismReviews(mount){
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  const { data:rows, error } = await sb.from('tourism_reviews')
    .select('*, tourism_places(name)').order('created_at',{ascending:false}).limit(300);
  if(error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(error.message)}</div>`; return; }
  if(!rows.length){ mount.innerHTML = `<div class="admin-empty">لا توجد تعليقات بعد.</div>`; return; }
  mount.innerHTML = `<p class="admin-count">${rows.length} تعليق</p><div id="trList"></div>`;
  const list = mount.querySelector('#trList');
  list.innerHTML = rows.map(r=>{
    const place = r.tourism_places?.name;
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const when = new Date(r.created_at).toLocaleDateString('ar');
    const placeHTML = place ? `<a href="tourism/place.html?id=${encodeURIComponent(r.place_id)}" target="_blank" rel="noopener"><b>${escapeHTML(place)}</b></a>` : '<span class="mod-hint">(مكان محذوف)</span>';
    return `
      <div class="admin-card" data-id="${r.id}" style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="min-width:0;flex:1;">
            <div style="font-weight:800;">${escapeHTML(r.name)} <span style="color:var(--warning,#eab308);">${stars}</span></div>
            <div style="font-size:.85em;color:var(--muted);margin-top:2px;">على مكان: ${placeHTML} · ${when}</div>
            ${r.text ? `<div style="margin-top:8px;">${escapeHTML(r.text)}</div>` : ''}
          </div>
          <button class="btn btn-danger tr-del" data-id="${r.id}" style="font-size:.85em;padding:6px 12px;flex-shrink:0;">حذف نهائي</button>
        </div>
      </div>`;
  }).join('');
  list.addEventListener('click', async (e)=>{
    const del = e.target.closest('.tr-del'); if(!del) return;
    if(!confirm('حذف هذا التعليق نهائياً؟')) return;
    const id = del.dataset.id;
    del.disabled = true;
    const { data, error } = await sb.from('tourism_reviews').delete().eq('id', id).select('id');
    if(error || !data || !data.length){ alert('تعذّر الحذف: ' + (error ? error.message : 'الصلاحيات ناقصة')); del.disabled = false; return; }
    toast('تم حذف التعليق');
    list.querySelector(`.admin-card[data-id="${id}"]`)?.remove();
    if(!list.querySelector('.admin-card')) mount.innerHTML = `<div class="admin-empty">لا توجد تعليقات بعد.</div>`;
  });
}

/* =========================================================
   ملعبك — التقييمات (malaabak_reviews)
   ========================================================= */
async function renderMalaabReviews(mount){
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  const { data:rows, error } = await sb.from('malaabak_reviews')
    .select('*').order('created_at',{ascending:false}).limit(300);
  if(error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(error.message)}</div>`; return; }
  if(!rows.length){ mount.innerHTML = `<div class="admin-empty">لا توجد تقييمات بعد.</div>`; return; }
  const names = await fetchTargetNames(rows);
  mount.innerHTML = `<p class="admin-count">${rows.length} تقييم</p><div id="mrList"></div>`;
  const list = mount.querySelector('#mrList');
  list.innerHTML = rows.map(r=>{
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const when = new Date(r.created_at).toLocaleDateString('ar');
    return `
      <div class="admin-card" data-id="${r.id}" style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="min-width:0;flex:1;">
            <div style="font-weight:800;">${escapeHTML(r.name)} <span style="color:var(--warning,#eab308);">${stars}</span></div>
            <div style="font-size:.85em;color:var(--muted);margin-top:2px;">على ${targetLinkHTML(r, names)} · ${when}</div>
            ${r.text ? `<div style="margin-top:8px;">${escapeHTML(r.text)}</div>` : ''}
          </div>
          <button class="btn btn-danger mr-del" data-id="${r.id}" style="font-size:.85em;padding:6px 12px;flex-shrink:0;">حذف نهائي</button>
        </div>
      </div>`;
  }).join('');
  list.addEventListener('click', async (e)=>{
    const del = e.target.closest('.mr-del'); if(!del) return;
    if(!confirm('حذف هذا التقييم نهائياً؟')) return;
    const id = del.dataset.id;
    del.disabled = true;
    const { data, error } = await sb.from('malaabak_reviews').delete().eq('id', id).select('id');
    if(error || !data || !data.length){ alert('تعذّر الحذف: ' + (error ? error.message : 'الصلاحيات ناقصة')); del.disabled = false; return; }
    toast('تم حذف التقييم');
    list.querySelector(`.admin-card[data-id="${id}"]`)?.remove();
    if(!list.querySelector('.admin-card')) mount.innerHTML = `<div class="admin-empty">لا توجد تقييمات بعد.</div>`;
  });
}

/* =========================================================
   ملعبك — الحجوزات (malaabak_bookings)
   ========================================================= */
async function renderMalaabBookings(mount){
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  const { data:rows, error } = await sb.from('malaabak_bookings')
    .select('*, profiles!malaabak_bookings_user_id_fkey(name)').order('created_at',{ascending:false}).limit(300);
  // fallback إذا اسم العلاقة غير موجود (لأن Postgres يسمّي المفتاح تلقائياً — قد يختلف):
  let list = rows;
  if(error){
    const r2 = await sb.from('malaabak_bookings').select('*').order('created_at',{ascending:false}).limit(300);
    if(r2.error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(r2.error.message)}</div>`; return; }
    list = r2.data;
  }
  if(!list.length){ mount.innerHTML = `<div class="admin-empty">لا توجد حجوزات بعد.</div>`; return; }
  const names = await fetchTargetNames(list);
  const STATUS_LABEL = { requested:'قيد الطلب', confirmed:'مؤكّد', cancelled:'ملغى' };
  mount.innerHTML = `<p class="admin-count">${list.length} حجز</p><div id="mbList"></div>`;
  const wrap = mount.querySelector('#mbList');
  wrap.innerHTML = list.map(r=>{
    const userName = r.profiles?.name || '—';
    const when = new Date(r.created_at).toLocaleString('ar');
    const statusColor = r.status==='confirmed'?'#1a9c5e': r.status==='cancelled'?'#94a0b2':'#0d9488';
    return `
      <div class="admin-card" data-id="${r.id}" style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
          <div style="min-width:0;flex:1;">
            <div style="font-weight:800;">${escapeHTML(userName)} → ${targetLinkHTML(r, names)}</div>
            <div style="font-size:.85em;color:var(--muted);margin-top:2px;">${when}</div>
            ${r.note ? `<div style="font-size:.85em;margin-top:6px;">📝 ${escapeHTML(r.note)}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
            <span style="font-size:.8em;padding:4px 10px;border-radius:999px;background:${statusColor}22;color:${statusColor};font-weight:700;">${STATUS_LABEL[r.status]||r.status}</span>
            ${r.status!=='confirmed'?`<button class="btn btn-primary mb-confirm" data-id="${r.id}" style="font-size:.8em;padding:6px 10px;">تأكيد</button>`:''}
            ${r.status!=='cancelled'?`<button class="btn btn-outline mb-cancel" data-id="${r.id}" style="font-size:.8em;padding:6px 10px;">إلغاء</button>`:''}
          </div>
        </div>
      </div>`;
  }).join('');
  async function setBookingStatus(id, status){
    const { data, error } = await sb.from('malaabak_bookings').update({ status }).eq('id', id).select('id');
    if(error){ alert('تعذّر الحفظ: '+error.message); return false; }
    if(!data || !data.length){ alert('ما تغيّر شي — سياسة RLS الحالية بتسمح لصاحب الحجز بس (شوف supabase_schema.sql).'); return false; }
    return true;
  }
  wrap.addEventListener('click', async (e)=>{
    const confirmBtn = e.target.closest('.mb-confirm');
    const cancelBtn  = e.target.closest('.mb-cancel');
    if(!confirmBtn && !cancelBtn) return;
    const btn = confirmBtn || cancelBtn;
    const id = btn.dataset.id;
    btn.disabled = true; btn.textContent = '...';
    const ok = await setBookingStatus(id, confirmBtn ? 'confirmed' : 'cancelled');
    if(ok) renderMalaabBookings(mount); else { btn.disabled=false; btn.textContent = confirmBtn?'تأكيد':'إلغاء'; }
  });
}

/* =========================================================
   الحسابات — كل المستخدمين / المشرفين
   ========================================================= */
async function renderUsers(mount, adminsOnly){
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  let q = sb.from('profiles').select('id, name, phone, avatar_url, is_admin, created_at').order('created_at',{ascending:false}).limit(500);
  if(adminsOnly) q = q.eq('is_admin', true);
  const { data, error } = await q;
  if(error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(error.message)}</div>`; return; }
  if(!data.length){ mount.innerHTML = `<div class="admin-empty">${adminsOnly?'لا يوجد مشرفون.':'لا يوجد مستخدمون.'}</div>`; return; }

  const searchBar = `<div style="margin-bottom:12px;"><input type="search" id="usrSearch" placeholder="بحث بالاسم أو الرقم..." style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:10px;font-family:inherit;"></div>`;
  const listId = 'usrList';
  mount.innerHTML = searchBar + `<div id="${listId}"></div>
    <p class="admin-empty" style="font-size:.85em;color:var(--muted);margin-top:10px;">إجمالي: ${data.length}</p>`;

  function render(filter){
    const filtered = filter ? data.filter(u => (u.name||'').includes(filter) || (u.phone||'').includes(filter) || (u.id||'').includes(filter)) : data;
    document.getElementById(listId).innerHTML = filtered.map(u=>{
      const name = u.name || '<span style="color:var(--muted);">(بلا اسم)</span>';
      const when = new Date(u.created_at).toLocaleDateString('ar');
      const badge = u.is_admin ? '<span style="font-size:.75em;padding:2px 8px;border-radius:999px;background:#0412ad22;color:#0412ad;font-weight:700;margin-inline-start:6px;">مشرف</span>' : '';
      const isMe = adminUser && u.id === adminUser.id;
      const toggleLabel = u.is_admin ? 'إلغاء الإشراف' : 'ترقية لمشرف';
      return `
        <div class="admin-card" data-id="${u.id}" style="display:flex;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:var(--surface);">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--border);display:grid;place-items:center;font-weight:700;color:var(--muted);flex-shrink:0;">${(u.name||'؟').slice(0,1)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;">${name}${badge}${isMe?'<span style="color:var(--muted);font-size:.8em;margin-inline-start:6px;">(أنت)</span>':''}</div>
            <div style="font-size:.8em;color:var(--muted);">${escapeHTML(u.phone||'—')} · انضم ${when} · <code style="font-size:.85em;">${u.id.slice(0,8)}...</code></div>
          </div>
          ${isMe ? '' : `<button class="btn ${u.is_admin?'btn-outline':'btn-primary'} usr-toggle" data-id="${u.id}" data-admin="${u.is_admin?'1':'0'}" style="font-size:.8em;padding:6px 12px;flex-shrink:0;">${toggleLabel}</button>
          <button class="btn btn-outline usr-delete" data-id="${u.id}" data-name="${escapeHTML(u.name||'')}" title="حذف الحساب نهائياً" style="font-size:.8em;padding:6px 12px;flex-shrink:0;border-color:#e0453d;color:#e0453d;">حذف</button>`}
        </div>`;
    }).join('') || `<div class="admin-empty">لا نتائج مطابقة.</div>`;
  }
  render('');
  document.getElementById('usrSearch').addEventListener('input', (e)=> render(e.target.value.trim()));

  mount.addEventListener('click', async (e)=>{
    const del = e.target.closest('.usr-delete');
    if(del){ await deleteUserFlow(del, data, ()=> render(document.getElementById('usrSearch').value.trim())); return; }

    const btn = e.target.closest('.usr-toggle'); if(!btn) return;
    const id = btn.dataset.id;
    const makeAdmin = btn.dataset.admin === '0';
    if(!confirm(makeAdmin ? 'ترقية هذا الحساب لمشرف؟' : 'إلغاء صلاحية الإشراف؟')) return;
    btn.disabled = true; btn.textContent = '...';
    const { error } = await sb.from('profiles').update({ is_admin: makeAdmin }).eq('id', id);
    if(error){ alert('تعذّر الحفظ: '+error.message); btn.disabled = false; return; }
    // حدّث السطر بالكاش والعرض
    const u = data.find(x=>x.id===id); if(u) u.is_admin = makeAdmin;
    render(document.getElementById('usrSearch').value.trim());
  });
}

/* حذف حساب — على مرحلتين عن قصد.
   الحذف بيصير بدالة سيرفر (netlify/functions/admin-delete-user.js) لأن حذف
   مستخدم من auth بيحتاج service_role، وهاد ما لازم يوصل للمتصفّح أبداً.
   المرحلة الأولى "معاينة" بتعدّ شو رح يروح بلا ما تحذف شي — المشرف لازم يشوف
   إن هالحساب إله 40 إعلان و12 صورة قبل ما يضغط تأكيد، مو بعده. */
async function callDeleteUserApi(userId, mode){
  const { data: { session } } = await sb.auth.getSession();
  if(!session) throw new Error('الجلسة منتهية — سجّل دخول من جديد');
  const res = await fetch('/.netlify/functions/admin-delete-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify({ user_id: userId, mode }),
  });
  const body = await res.json().catch(()=> ({}));
  if(!res.ok) throw new Error(body.error || ('خطأ ' + res.status));
  return body;
}

function countsSummary(counts, files){
  const lines = Object.entries(counts || {})
    .filter(([, n]) => n === null || n > 0)
    .map(([label, n]) => `  • ${label}: ${n === null ? 'غير معروف' : n}`);
  if(files) lines.push(`  • ملفات صور: ${files}`);
  return lines.length ? lines.join('\n') : '  (لا يوجد محتوى مرتبط)';
}

async function deleteUserFlow(btn, cache, rerender){
  const id = btn.dataset.id;
  const name = btn.dataset.name || '(بلا اسم)';
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = '...';

  let preview;
  try{ preview = await callDeleteUserApi(id, 'preview'); }
  catch(err){ alert('تعذّرت المعاينة: ' + err.message); btn.disabled = false; btn.textContent = original; return; }

  const msg = `حذف حساب "${name}" نهائياً؟\n\nرح ينحذف معه:\n${countsSummary(preview.counts, preview.files)}\n\nهالعملية ما بتنرجع.`;
  if(!confirm(msg)){ btn.disabled = false; btn.textContent = original; return; }

  // تأكيد ثاني بكتابة كلمة — الحذف نهائي ومع كل المحتوى، فمنع ضغطة بالغلط
  const typed = prompt('للتأكيد اكتب كلمة: حذف');
  if(typed !== 'حذف'){ btn.disabled = false; btn.textContent = original; return; }

  btn.textContent = 'جاري الحذف...';
  let result;
  try{ result = await callDeleteUserApi(id, 'delete'); }
  catch(err){ alert('فشل الحذف: ' + err.message); btn.disabled = false; btn.textContent = original; return; }

  const idx = cache.findIndex(u => u.id === id);
  if(idx !== -1) cache.splice(idx, 1);
  rerender();
  alert(`تم حذف الحساب.\n\n${countsSummary(result.deleted)}`);
}
