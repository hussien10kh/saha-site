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
      {id:'visitors', label:'الزوار',    icon:ADMIN_ICONS.visitors},
      {id:'errors',   label:'الأخطاء',   icon:ADMIN_ICONS.errors},
      {id:'settings', label:'الإعدادات', icon:ADMIN_ICONS.settings},
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
    overview:'نظرة عامة', ads:'الإعلانات — كل الإعلانات', visitors:'الزوار', errors:'الأخطاء',
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
  if(currentTab==='errors') return renderErrorsTab(mount);
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
  const vstats = getVisitorStats();
  const byCategory = {
    realestate: ads.filter(a=>a.category==='realestate').length,
    cars: ads.filter(a=>a.category==='cars').length,
    misc: ads.filter(a=>a.category==='misc').length,
  };
  mount.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num">${vstats.dailyCount}</div><div class="stat-label">زوار اليوم</div></div>
      <div class="stat-card"><div class="stat-num">${vstats.weeklyCount}</div><div class="stat-label">زوار هذا الأسبوع</div></div>
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

/* ---------------- Visitors tab ---------------- */
async function renderVisitorsTab(mount){
  const v = getVisitorStats();
  const fstats = getFilterStats().slice(0, 8);
  const allAds = await getAllAdsAdmin();
  const ads = allAds.slice().sort((a,b)=> (b.views||0)-(a.views||0)).slice(0,6);

  mount.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num">${v.dailyCount}</div><div class="stat-label">زوار اليوم</div></div>
      <div class="stat-card"><div class="stat-num">${v.weeklyCount}</div><div class="stat-label">زوار هذا الأسبوع</div></div>
      <div class="stat-card"><div class="stat-num">${formatDuration(v.avgDurationSec)}</div><div class="stat-label">متوسط مدة الزيارة</div></div>
      <div class="stat-card"><div class="stat-num">${v.totalSessions}</div><div class="stat-label">إجمالي الزيارات المسجّلة</div></div>
    </div>

    <h3 class="section-heading">مصدر الزيارات</h3>
    ${v.sources && v.sources.length ? `
    <table class="admin-table">
      <thead><tr><th>المصدر</th><th>عدد الزيارات</th><th>النسبة</th></tr></thead>
      <tbody>
        ${v.sources.map(s=>`
          <tr>
            <td class="cell-title">${s.source}</td>
            <td>${s.count}</td>
            <td>${Math.round(s.count / v.totalSessions * 100)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : `<div class="admin-empty">لا توجد بيانات مصادر بعد</div>`}

    <h3 class="section-heading">الإعلانات الأكثر مشاهدة</h3>
    ${ads.length ? `
    <table class="admin-table">
      <thead><tr><th></th><th>الإعلان</th><th>التصنيف</th><th>المشاهدات</th></tr></thead>
      <tbody>
        ${ads.map(ad=>`
          <tr>
            <td><img src="${ad.images[0] || PLACEHOLDER_IMG}" alt=""></td>
            <td class="cell-title">${escapeHTML(ad.title)}</td>
            <td><span class="admin-badge">${escapeHTML(CATEGORY_LABELS[ad.category]||ad.category)}</span></td>
            <td>${(ad.views||0).toLocaleString('en-US')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : `<div class="admin-empty">لا توجد بيانات بعد</div>`}

    <h3 class="section-heading">التصنيفات والبحث الأكثر استخداماً (فلترة)</h3>
    ${fstats.length ? `
    <table class="admin-table">
      <thead><tr><th>النوع</th><th>القيمة</th><th>عدد المرات</th></tr></thead>
      <tbody>
        ${fstats.map(f=>`
          <tr>
            <td>${f.type==='category' ? 'تصنيف' : 'بحث'}</td>
            <td class="cell-title">${f.type==='category' ? (CATEGORY_LABELS[f.value]||f.value) : f.value}</td>
            <td>${f.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : `<div class="admin-empty">لا توجد بيانات فلترة/بحث بعد</div>`}

    <p style="font-size:12.5px;color:var(--muted-2);margin-top:18px;line-height:1.9;">
      ملاحظة: إحصائيات الزوار محلية تُحسب من زيارات هذا المتصفح فقط (لا يوجد خادم مركزي يجمع بيانات كل الزوار الحقيقيين)، بينما الإعلانات والمشاهدات مصدرها قاعدة البيانات الفعلية.
    </p>
  `;
}

/* ---------------- Errors tab ---------------- */
function renderErrorsTab(mount){
  const errors = getErrors();
  const hook = getErrorWebhook();
  mount.innerHTML = `
    <div class="panel" style="margin-bottom:20px;">
      <h3 class="panel-title">إرسال الأخطاء تلقائياً (اختياري)</h3>
      <p style="font-size:13px;color:var(--muted);margin-top:-8px;margin-bottom:14px;">
        الأخطاء تُسجَّل تلقائياً في هذه اللوحة بمجرد حدوثها. لإرسالها فورياً أيضاً لخدمة خارجية
        (مثل Slack أو Discord webhook أو أي رابط استقبال تختاره)، ضع الرابط هنا:
      </p>
      <div class="form-grid">
        <div class="field full">
          <input type="text" id="webhookInput" placeholder="https://example.com/webhook" value="${hook}">
        </div>
      </div>
      <button class="btn btn-primary" id="saveWebhookBtn">حفظ</button>
    </div>

    <div class="admin-toolbar">
      <div style="font-weight:700;font-size:14px;">آخر الأخطاء المسجّلة (${errors.length})</div>
      <button class="btn btn-outline" id="clearErrorsBtn">مسح السجل</button>
    </div>
    ${errors.length ? `
    <table class="admin-table">
      <thead><tr><th>الوقت</th><th>الصفحة</th><th>الرسالة</th><th>السطر</th></tr></thead>
      <tbody>
        ${errors.map(er=>`
          <tr>
            <td>${new Date(er.date).toLocaleString('ar')}</td>
            <td>${er.page || er.source || '-'}</td>
            <td class="cell-title" style="max-width:360px;white-space:normal;">${er.message}</td>
            <td>${er.line ?? '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : `<div class="admin-empty">لا توجد أخطاء مسجّلة — ممتاز 👍</div>`}
  `;
  document.getElementById('saveWebhookBtn').addEventListener('click', ()=>{
    setErrorWebhook(document.getElementById('webhookInput').value.trim());
    toast('تم حفظ رابط الإرسال التلقائي');
  });
  document.getElementById('clearErrorsBtn').addEventListener('click', ()=>{
    if(confirm('هل تريد مسح كل سجل الأخطاء؟')){
      clearErrors();
      toast('تم مسح سجل الأخطاء');
      renderErrorsTab(mount);
    }
  });
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
