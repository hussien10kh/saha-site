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
  if(!(await requireAdmin())) return;
  adminUser = await getCurrentUser();
  renderSidebar();
  renderTopbar();
  renderTab();
}

function renderSidebar(){
  const mount = document.getElementById('adminSidebar');
  const items = [
    {id:'overview', label:'نظرة عامة', icon:ADMIN_ICONS.overview},
    {id:'ads', label:'الإعلانات', icon:ADMIN_ICONS.ads},
    {id:'visitors', label:'الزوار', icon:ADMIN_ICONS.visitors},
    {id:'errors', label:'الأخطاء', icon:ADMIN_ICONS.errors},
    {id:'comments', label:'التعليقات', icon:ADMIN_ICONS.comments},
    {id:'settings', label:'الإعدادات', icon:ADMIN_ICONS.settings},
  ];
  mount.innerHTML = `
    <div class="admin-logo">ساحة<span>.</span> إدارة</div>
    ${items.map(i=>`
      <button class="admin-nav-item ${currentTab===i.id?'active':''}" data-tab="${i.id}">${i.icon}<span>${i.label}</span></button>
    `).join('')}
    <div class="admin-nav-spacer"></div>
    <a class="admin-nav-item" href="index.html" target="_blank">${ICONS.home}<span>عرض الموقع</span></a>
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
  const titles = {overview:'نظرة عامة', ads:'إدارة الإعلانات', visitors:'الزوار', errors:'الأخطاء', comments:'إدارة التعليقات', settings:'الإعدادات'};
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
      openAdModal(await getAdById(id));
    });
  });
  scope.querySelectorAll('.delete-ad-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.closest('tr').dataset.id;
      const ad = await getAdById(id);
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
