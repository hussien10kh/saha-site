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
  eye:ICONS.eye,
  menu:ICONS.menu,
  close:ICONS.close,
  visitors:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  errors:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.9 18.5a1.7 1.7 0 0 0 1.5 2.6h17.2a1.7 1.7 0 0 0 1.5-2.6L13.7 3.9a1.7 1.7 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>`,
};

let currentTab = 'overview';
let editingAdId = null;
let adminUser = null;

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
  renderSidebar();
  renderTopbar();
  renderTab();
}

function renderSidebar(){
  const mount = document.getElementById('adminSidebar');
  // ثلاثة أقسام: الإعلانات (ساحة الأصلية) · السياحة · الرياضة (ملعبك).
  // كل قسم عنوان + بنوده. نفس نمط "أزرار التبويب" الحالي — بلا تغيير على أي شي موجود.
  const sections = [
    { title:'الإعلانات', items:[
      {id:'overview', label:'نظرة عامة', icon:ADMIN_ICONS.overview},
      {id:'ads',      label:'الإعلانات', icon:ADMIN_ICONS.ads},
      {id:'visitors', label:'الزوار',    icon:ADMIN_ICONS.visitors},
      {id:'errors',   label:'الأخطاء',   icon:ADMIN_ICONS.errors},
      {id:'comments', label:'التعليقات', icon:ADMIN_ICONS.comments},
      {id:'settings', label:'الإعدادات', icon:ADMIN_ICONS.settings},
    ]},
    { title:'السياحة', items:[
      {id:'tourism-pending', label:'أماكن معلّقة',      icon:ADMIN_ICONS.overview},
      {id:'tourism-reviews', label:'تعليقات السياحة',  icon:ADMIN_ICONS.comments},
    ]},
    { title:'الرياضة (ملعبك)', items:[
      {id:'malaab-venues',    label:'ملاعب معلّقة',    icon:ADMIN_ICONS.overview},
      {id:'malaab-coaches',   label:'مدربين معلّقين',  icon:ADMIN_ICONS.overview},
      {id:'malaab-academies', label:'أكاديميات معلّقة', icon:ADMIN_ICONS.overview},
      {id:'malaab-talents',   label:'مواهب معلّقة',   icon:ADMIN_ICONS.overview},
      {id:'malaab-reviews',   label:'تقييمات ملعبك',  icon:ADMIN_ICONS.comments},
      {id:'malaab-bookings',  label:'حجوزات ملعبك',   icon:ADMIN_ICONS.ads},
    ]},
    { title:'الحسابات', items:[
      {id:'users-all',    label:'كل الحسابات',   icon:ADMIN_ICONS.visitors},
      {id:'users-admins', label:'المشرفون',       icon:ADMIN_ICONS.settings},
    ]},
  ];
  const renderItem = (i) => `<button class="admin-nav-item ${currentTab===i.id?'active':''}" data-tab="${i.id}">${i.icon}<span>${i.label}</span></button>`;
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
    });
  });
  document.getElementById('adminLogoutBtn').addEventListener('click', async ()=>{
    await adminLogout();
    location.href = 'admin-login.html';
  });
}

function renderTopbar(){
  const titles = {
    overview:'نظرة عامة', ads:'إدارة الإعلانات', visitors:'الزوار', errors:'الأخطاء',
    comments:'إدارة التعليقات', settings:'الإعدادات',
    'tourism-pending':'السياحة — أماكن معلّقة',
    'tourism-reviews':'السياحة — التعليقات',
    'malaab-venues':'ملعبك — ملاعب معلّقة',
    'malaab-coaches':'ملعبك — مدربين معلّقين',
    'malaab-academies':'ملعبك — أكاديميات معلّقة',
    'malaab-talents':'ملعبك — مواهب معلّقة',
    'malaab-reviews':'ملعبك — التقييمات',
    'malaab-bookings':'ملعبك — الحجوزات',
    'users-all':'الحسابات — كل المستخدمين',
    'users-admins':'الحسابات — المشرفون',
  };
  document.getElementById('adminTopbar').innerHTML = `
    <button class="admin-icon-btn" id="sidebarToggle" style="display:none;">${ADMIN_ICONS.menu}</button>
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
  if(currentTab==='tourism-pending') return renderTourismPending(mount);
  if(currentTab==='tourism-reviews') return renderTourismReviews(mount);
  if(currentTab==='malaab-reviews') return renderMalaabReviews(mount);
  if(currentTab==='malaab-bookings') return renderMalaabBookings(mount);
  if(currentTab==='users-all')    return renderUsers(mount, false);
  if(currentTab==='users-admins') return renderUsers(mount, true);
  if(currentTab && currentTab.startsWith('malaab-')) return renderMalaabPending(mount, currentTab.slice('malaab-'.length));
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
    <h3 class="section-heading" style="margin-top:8px;">أحدث الإعلانات</h3>
    ${adsTableHTML(ads.slice(0,5), false)}
  `;
  wireAdsTableActions(mount);
}

/* ---------------- Ads tab ---------------- */
async function renderAdsTab(mount){
  mount.innerHTML = `
    <div class="admin-toolbar">
      <input type="text" class="admin-search" id="adSearch" placeholder="ابحث عن إعلان بالعنوان...">
      <button class="btn btn-primary" id="addAdBtn">${ADMIN_ICONS.plus}إضافة إعلان</button>
    </div>
    <div id="adsTableWrap"></div>
  `;
  const allAds = await getAllAdsAdmin();
  const renderList = ()=>{
    const q = document.getElementById('adSearch').value.trim().toLowerCase();
    let ads = allAds;
    if(q) ads = ads.filter(a=>a.title.toLowerCase().includes(q));
    document.getElementById('adsTableWrap').innerHTML = adsTableHTML(ads, true);
    wireAdsTableActions(document.getElementById('adsTableWrap'));
  };
  document.getElementById('adSearch').addEventListener('input', renderList);
  document.getElementById('addAdBtn').addEventListener('click', ()=> openAdModal(null));
  renderList();
}

function adsTableHTML(ads, showActions){
  if(!ads.length) return `<div class="admin-empty">لا توجد إعلانات</div>`;
  return `
  <table class="admin-table">
    <thead><tr>
      <th></th><th>العنوان</th><th>التصنيف</th><th>السعر</th><th>المدينة</th><th>تاريخ النشر</th>${showActions?'<th></th>':''}
    </tr></thead>
    <tbody>
      ${ads.map(ad=>`
        <tr data-id="${ad.id}">
          <td><img src="${ad.images[0] || PLACEHOLDER_IMG}" alt=""></td>
          <td class="cell-title">${escapeHTML(ad.title)}</td>
          <td><span class="admin-badge">${escapeHTML(CATEGORY_LABELS[ad.category]||ad.category)}</span></td>
          <td>${formatPrice(ad.price)}</td>
          <td>${escapeHTML(ad.city)}</td>
          <td>${escapeHTML(ad.postedAgo)}</td>
          ${showActions ? `
          <td>
            <div class="row-actions">
              <a class="admin-icon-btn" href="listing.html?id=${ad.id}" target="_blank" title="عرض">${ADMIN_ICONS.eye}</a>
              <button class="admin-icon-btn edit-ad-btn" title="تعديل">${ADMIN_ICONS.edit}</button>
              <button class="admin-icon-btn danger delete-ad-btn" title="حذف">${ADMIN_ICONS.trash}</button>
            </div>
          </td>` : ''}
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

function wireAdsTableActions(scope){
  scope.querySelectorAll('.edit-ad-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.closest('tr').dataset.id;
      let ad;
      try{ ad = await getAdById(id); }
      catch(e){ console.error('admin getAdById (edit) failed:', e); toast('تعذّر تحميل بيانات الإعلان، تحقق من اتصالك بالإنترنت', 'error'); return; }
      openAdModal(ad);
    });
  });
  scope.querySelectorAll('.delete-ad-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.closest('tr').dataset.id;
      let ad;
      try{ ad = await getAdById(id); }
      catch(e){ console.error('admin getAdById (delete) failed:', e); toast('تعذّر تحميل بيانات الإعلان، تحقق من اتصالك بالإنترنت', 'error'); return; }
      if(confirm(`هل أنت متأكد من حذف الإعلان "${ad ? ad.title : ''}"؟`)){
        try{
          await deleteAd(id);
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

/* ---------------- Ad add/edit modal ---------------- */
function openAdModal(ad){
  editingAdId = ad ? ad.id : null;
  document.getElementById('modalTitle').textContent = ad ? 'تعديل الإعلان' : 'إضافة إعلان جديد';
  document.getElementById('modalBody').innerHTML = `
    <div class="field full">
      <label>التصنيف</label>
      <select id="mCategory">
        <option value="realestate">عقار</option>
        <option value="cars">سيارات</option>
        <option value="misc">غير مصنف</option>
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
  mount.innerHTML = `<div id="commentsTableWrap"></div>`;
  renderCommentsTable();
}
async function renderCommentsTable(){
  const list = await getAllCommentsFlat();
  const wrap = document.getElementById('commentsTableWrap');
  if(!list.length){ wrap.innerHTML = `<div class="admin-empty">لا توجد تعليقات بعد</div>`; return; }
  wrap.innerHTML = `
  <table class="admin-table">
    <thead><tr><th>الإعلان</th><th>الاسم</th><th>التعليق</th><th>الوقت</th><th></th></tr></thead>
    <tbody>
      ${list.map(c=>`
        <tr data-id="${c.id}">
          <td class="cell-title">${escapeHTML(c.adTitle)}</td>
          <td>${escapeHTML(c.name)}</td>
          <td class="cell-title" style="max-width:320px;">${escapeHTML(c.text)}</td>
          <td>${escapeHTML(c.time)}</td>
          <td><button class="admin-icon-btn danger delete-comment-btn" title="حذف">${ADMIN_ICONS.trash}</button></td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
  wrap.querySelectorAll('.delete-comment-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const tr = btn.closest('tr');
      if(confirm('هل تريد حذف هذا التعليق؟')){
        try{
          await deleteComment(tr.dataset.id);
          toast('تم حذف التعليق');
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
   السياحة — أماكن معلّقة (tourism_places status='pending')
   يقرأ ويعرض ويوافق/يرفض عبر Supabase مباشرة (RLS بيتحقق من is_admin للتعديل).
   ========================================================= */
async function renderTourismPending(mount){
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  const { data:rows, error } = await sb.from('tourism_places')
    .select('*').eq('status','pending').order('created_at',{ascending:false});
  if(error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(error.message)}</div>`; return; }
  if(!rows.length){ mount.innerHTML = `<div class="admin-empty">✅ ما في أماكن معلّقة.</div>`; return; }
  mount.innerHTML = rows.map(r=>{
    const img = (r.images && r.images[0]) ? `<img src="${escapeHTML(r.images[0])}" alt="" style="width:70px;height:70px;object-fit:cover;border-radius:10px;">` : '<div style="width:70px;height:70px;background:var(--border);border-radius:10px;"></div>';
    return `
      <div class="admin-card" data-id="${r.id}" style="display:flex;gap:14px;align-items:center;padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);">
        ${img}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;">${escapeHTML(r.name)}</div>
          <div style="font-size:.85em;color:var(--muted);">${escapeHTML(r.category)} · ${escapeHTML(r.region)} - ${escapeHTML(r.city)}</div>
          ${r.description ? `<div style="font-size:.82em;color:var(--muted);margin-top:4px;">${escapeHTML(r.description).slice(0,140)}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="btn btn-primary tourism-approve" data-id="${r.id}" style="font-size:.85em;padding:8px 14px;">موافقة</button>
          <button class="btn btn-danger tourism-reject" data-id="${r.id}" style="font-size:.85em;padding:8px 14px;">رفض</button>
        </div>
      </div>`;
  }).join('');
  mount.addEventListener('click', async (e)=>{
    const approve = e.target.closest('.tourism-approve');
    const reject  = e.target.closest('.tourism-reject');
    if(!approve && !reject) return;
    const id = (approve||reject).dataset.id;
    const status = approve ? 'approved' : 'rejected';
    const btn = approve || reject;
    btn.disabled = true; btn.textContent = '...';
    const { error } = await sb.from('tourism_places')
      .update({ status, reviewed_by: adminUser.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    if(error){ alert('تعذّر الحفظ: '+error.message); btn.disabled=false; btn.textContent = approve?'موافقة':'رفض'; return; }
    document.querySelector(`.admin-card[data-id="${id}"]`)?.remove();
    if(!mount.querySelector('.admin-card')) mount.innerHTML = `<div class="admin-empty">✅ ما في أماكن معلّقة.</div>`;
  }, { once:true });
}

/* =========================================================
   ملعبك — طلبات معلّقة حسب النوع (venues/coaches/academies/talents)
   ========================================================= */
async function renderMalaabPending(mount, type){
  const NAMES = { venues:'الملاعب', coaches:'المدربين', academies:'الأكاديميات', talents:'المواهب' };
  const META = {
    venues:    (x)=>`${x.sport} · ${x.governorate} - ${x.city}`,
    coaches:   (x)=>`${x.specialty} · ${x.governorate} - ${x.city}`,
    academies: (x)=>`${(x.sports||[]).join('، ')} · ${x.governorate} - ${x.city}`,
    talents:   (x)=>`${x.sport} · ${x.position||''} · ${x.age||'?'} سنة · ${x.governorate}`,
  };
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  let items;
  try { items = await MalaabakAPI.pending(type); }
  catch(err){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(err.message)}</div>`; return; }
  if(!items.length){ mount.innerHTML = `<div class="admin-empty">✅ ما في طلبات معلّقة بـ${NAMES[type]}.</div>`; return; }
  const cache = new Map(items.map(x=>[x.id, x]));

  mount.innerHTML = items.map(x=>{
    const image = (x.images && x.images[0]) || x.image || '';
    const imgHTML = image.startsWith && image.startsWith('http')
      ? `<img src="${escapeHTML(image)}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;">`
      : `<div style="width:70px;height:70px;background:var(--border);border-radius:10px;display:grid;place-items:center;font-size:1.8em;">${escapeHTML(image||'📄')}</div>`;
    let videoRows = '';
    if(type==='talents' && x.videos && x.videos.length){
      videoRows = '<div style="margin-top:8px;font-size:.82em;">' + x.videos.map((v,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
          <span style="flex:1;">🎬 ${escapeHTML(v.title||`فيديو ${i+1}`)}</span>
          ${v.videoUrl?`<a href="${escapeHTML(v.videoUrl)}" target="_blank" style="color:var(--primary);">فتح ↗</a>`:''}
          <select class="mlb-vaction" data-id="${x.id}" data-idx="${i}" style="border:1px solid var(--border);border-radius:6px;padding:2px 6px;">
            <option value="asis"${(v.action||'asis')==='asis'?' selected':''}>نشر كما هو</option>
            <option value="muted"${v.action==='muted'?' selected':''}>حذف الصوت</option>
            <option value="deleted"${v.action==='deleted'?' selected':''}>حذف الفيديو</option>
          </select>
        </div>`).join('') + '</div>';
    }
    return `
      <div class="admin-card" data-id="${x.id}" style="display:flex;gap:14px;align-items:flex-start;padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);">
        ${imgHTML}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;">${escapeHTML(x.name)}</div>
          <div style="font-size:.85em;color:var(--muted);">${escapeHTML(META[type](x))}</div>
          ${videoRows}
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="btn btn-primary mlb-approve" data-id="${x.id}" style="font-size:.85em;padding:8px 14px;">موافقة</button>
          <button class="btn btn-danger mlb-reject" data-id="${x.id}" style="font-size:.85em;padding:8px 14px;">رفض</button>
        </div>
      </div>`;
  }).join('');

  mount.addEventListener('click', async (e)=>{
    const approve = e.target.closest('.mlb-approve');
    const reject  = e.target.closest('.mlb-reject');
    if(!approve && !reject) return;
    const id = (approve||reject).dataset.id;
    const status = approve ? 'approved' : 'rejected';
    const btn = approve || reject;
    btn.disabled = true; btn.textContent = '...';
    try {
      await MalaabakAPI.setStatus(type, id, status);
      document.querySelector(`.admin-card[data-id="${id}"]`)?.remove();
      cache.delete(id);
      if(!cache.size) mount.innerHTML = `<div class="admin-empty">✅ ما في طلبات معلّقة بـ${NAMES[type]}.</div>`;
    } catch(err){
      alert('تعذّر الحفظ: '+err.message);
      btn.disabled=false; btn.textContent = approve?'موافقة':'رفض';
    }
  }, { once:true });

  mount.addEventListener('change', async (e)=>{
    const sel = e.target.closest('.mlb-vaction');
    if(!sel) return;
    const id = sel.dataset.id; const idx = Number(sel.dataset.idx); const val = sel.value;
    const item = cache.get(id); if(!item) return;
    item.videos[idx] = { ...item.videos[idx], action: val };
    try { await MalaabakAPI.update(type, id, { videos: item.videos }); }
    catch(err){ alert('تعذّر حفظ قرار الفيديو: '+err.message); }
  });
}

/* =========================================================
   السياحة — التعليقات (tourism_reviews)
   ========================================================= */
async function renderTourismReviews(mount){
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  const { data:rows, error } = await sb.from('tourism_reviews')
    .select('*, tourism_places(name)').order('created_at',{ascending:false}).limit(200);
  if(error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(error.message)}</div>`; return; }
  if(!rows.length){ mount.innerHTML = `<div class="admin-empty">لا توجد تعليقات بعد.</div>`; return; }
  mount.innerHTML = rows.map(r=>{
    const place = r.tourism_places?.name || '—';
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const when = new Date(r.created_at).toLocaleDateString('ar');
    return `
      <div class="admin-card" data-id="${r.id}" style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="min-width:0;flex:1;">
            <div style="font-weight:800;">${escapeHTML(r.name)} <span style="color:var(--warning,#eab308);">${stars}</span></div>
            <div style="font-size:.85em;color:var(--muted);margin-top:2px;">على مكان: <b>${escapeHTML(place)}</b> · ${when}</div>
            ${r.text ? `<div style="margin-top:8px;">${escapeHTML(r.text)}</div>` : ''}
          </div>
          <button class="btn btn-danger tr-del" data-id="${r.id}" style="font-size:.85em;padding:6px 12px;flex-shrink:0;">حذف</button>
        </div>
      </div>`;
  }).join('');
  mount.addEventListener('click', async (e)=>{
    const del = e.target.closest('.tr-del'); if(!del) return;
    if(!confirm('حذف هذا التعليق؟')) return;
    const id = del.dataset.id;
    const { error } = await sb.from('tourism_reviews').delete().eq('id', id);
    if(error){ alert('تعذّر الحذف: '+error.message); return; }
    document.querySelector(`.admin-card[data-id="${id}"]`)?.remove();
    if(!mount.querySelector('.admin-card')) mount.innerHTML = `<div class="admin-empty">لا توجد تعليقات بعد.</div>`;
  }, { once:true });
}

/* =========================================================
   ملعبك — التقييمات (malaabak_reviews)
   ========================================================= */
async function renderMalaabReviews(mount){
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  const { data:rows, error } = await sb.from('malaabak_reviews')
    .select('*').order('created_at',{ascending:false}).limit(200);
  if(error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(error.message)}</div>`; return; }
  if(!rows.length){ mount.innerHTML = `<div class="admin-empty">لا توجد تقييمات بعد.</div>`; return; }
  const TYPE_LABEL = { venue:'ملعب', coach:'مدرب', academy:'أكاديمية' };
  mount.innerHTML = rows.map(r=>{
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const when = new Date(r.created_at).toLocaleDateString('ar');
    return `
      <div class="admin-card" data-id="${r.id}" style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="min-width:0;flex:1;">
            <div style="font-weight:800;">${escapeHTML(r.name)} <span style="color:var(--warning,#eab308);">${stars}</span></div>
            <div style="font-size:.85em;color:var(--muted);margin-top:2px;">على ${escapeHTML(TYPE_LABEL[r.target_type]||r.target_type)}: <code style="font-size:.85em;">${escapeHTML(String(r.target_id).slice(0,8))}...</code> · ${when}</div>
            ${r.text ? `<div style="margin-top:8px;">${escapeHTML(r.text)}</div>` : ''}
          </div>
          <button class="btn btn-danger mr-del" data-id="${r.id}" style="font-size:.85em;padding:6px 12px;flex-shrink:0;">حذف</button>
        </div>
      </div>`;
  }).join('');
  mount.addEventListener('click', async (e)=>{
    const del = e.target.closest('.mr-del'); if(!del) return;
    if(!confirm('حذف هذا التقييم؟')) return;
    const id = del.dataset.id;
    const { error } = await sb.from('malaabak_reviews').delete().eq('id', id);
    if(error){ alert('تعذّر الحذف: '+error.message); return; }
    document.querySelector(`.admin-card[data-id="${id}"]`)?.remove();
    if(!mount.querySelector('.admin-card')) mount.innerHTML = `<div class="admin-empty">لا توجد تقييمات بعد.</div>`;
  }, { once:true });
}

/* =========================================================
   ملعبك — الحجوزات (malaabak_bookings)
   ========================================================= */
async function renderMalaabBookings(mount){
  mount.innerHTML = '<div class="admin-empty">جاري التحميل...</div>';
  const { data:rows, error } = await sb.from('malaabak_bookings')
    .select('*, profiles!malaabak_bookings_user_id_fkey(name)').order('created_at',{ascending:false}).limit(200);
  // fallback إذا اسم العلاقة غير موجود (لأن Postgres يسمّي المفتاح تلقائياً — قد يختلف):
  let list = rows;
  if(error){
    const r2 = await sb.from('malaabak_bookings').select('*').order('created_at',{ascending:false}).limit(200);
    if(r2.error){ mount.innerHTML = `<div class="admin-empty">تعذّر التحميل: ${escapeHTML(r2.error.message)}</div>`; return; }
    list = r2.data;
  }
  if(!list.length){ mount.innerHTML = `<div class="admin-empty">لا توجد حجوزات بعد.</div>`; return; }
  const TYPE_LABEL = { match:'مباراة', training:'تمرين', event:'فعالية', venue:'ملعب' };
  const STATUS_LABEL = { requested:'قيد الطلب', confirmed:'مؤكّد', cancelled:'ملغى' };
  mount.innerHTML = list.map(r=>{
    const userName = r.profiles?.name || '—';
    const when = new Date(r.created_at).toLocaleString('ar');
    const statusColor = r.status==='confirmed'?'#1a9c5e': r.status==='cancelled'?'#94a0b2':'#0d9488';
    return `
      <div class="admin-card" data-id="${r.id}" style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px;background:var(--surface);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
          <div style="min-width:0;flex:1;">
            <div style="font-weight:800;">${escapeHTML(userName)} → ${escapeHTML(TYPE_LABEL[r.target_type]||r.target_type)}</div>
            <div style="font-size:.85em;color:var(--muted);margin-top:2px;"><code>${escapeHTML(String(r.target_id).slice(0,8))}...</code> · ${when}</div>
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
    const { error } = await sb.from('malaabak_bookings').update({ status }).eq('id', id);
    if(error){ alert('تعذّر الحفظ: '+error.message); return false; }
    return true;
  }
  mount.addEventListener('click', async (e)=>{
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
          ${isMe ? '' : `<button class="btn ${u.is_admin?'btn-outline':'btn-primary'} usr-toggle" data-id="${u.id}" data-admin="${u.is_admin?'1':'0'}" style="font-size:.8em;padding:6px 12px;flex-shrink:0;">${toggleLabel}</button>`}
        </div>`;
    }).join('') || `<div class="admin-empty">لا نتائج مطابقة.</div>`;
  }
  render('');
  document.getElementById('usrSearch').addEventListener('input', (e)=> render(e.target.value.trim()));

  mount.addEventListener('click', async (e)=>{
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
