/* دوال الرسم على السيرفر — مرآة حرفية لنظيراتها بـjs/app.js.

   ليش نسخة وما منشارك الملف؟ app.js ملف متصفّح: بيلمس document و
   localStorage من أول سطر، وما بينحمّل بـNode. فالبطاقة هون لازم تطلع بنفس
   الـHTML اللي بيطلّعه adCardHTML بالمتصفّح — لأن المتصفّح بيعيد الرسم فوق
   نسخة السيرفر، ولو اختلفوا بيشوف الزائر "قفزة". لو عدّلت شكل البطاقة هناك،
   عدّله هون. */

const SUPABASE_URL = 'https://uijijqkbctemcfdzoxlg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fKElveNWpcfKrcC9GBjo4Q_48S5m2EK';
const AD_EXPIRY_DAYS = 90;

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const ICONS = {
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`,
};

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// لحقن JSON جوّا <script>: "</script>" داخل نص إعلان كان بيقفل الوسم ويكسر الصفحة
function jsonForScript(obj) {
  // بلا أي backslash بالمصدر عمداً: أدوات التحرير بتحوّل تسلسل الهروب لحرف فعلي وبيصير بلا مفعول
  const BS = String.fromCharCode(92);
  const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  return JSON.stringify(obj).split('<').join(BS + 'u003c').split(LS).join(BS + 'u2028').split(PS).join(BS + 'u2029');
}

function timeAgo(dateInput) {
  const then = new Date(dateInput).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'الآن';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `منذ ${mins} ${mins === 1 ? 'دقيقة' : 'دقائق'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
  const months = Math.floor(days / 30);
  return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
}

function memberSinceLabel(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatPrice(n) {
  if (n === null || n === undefined || n === '') return 'السعر عند التواصل';
  return Number(n).toLocaleString('en-US') + ' ل.س';
}

function mapAdRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    category: row.category,
    title: row.title,
    description: row.description,
    price: row.price,
    city: row.city,
    images: (row.images && row.images.length) ? row.images : [],
    seller: row.seller_name,
    phone: row.phone,
    contactMethod: row.contact_method,
    views: row.views || 0,
    createdAt: row.created_at,
    postedAgo: timeAgo(row.created_at),
    memberSince: row.profiles ? memberSinceLabel(row.profiles.created_at) : '',
  };
}

function adCardHTML(ad) {
  const title = escapeHTML(ad.title), desc = escapeHTML(ad.description);
  const seller = escapeHTML(ad.seller), city = escapeHTML(ad.city);
  const hasImage = ad.images && ad.images.length > 0;
  return `
  <a class="ad-card" href="listing.html?id=${ad.id}">
    ${hasImage ? `
    <div class="ad-thumb">
      <img src="${escapeHTML(ad.images[0])}" alt="${title}" loading="lazy">
    </div>` : ''}
    <div class="ad-body">
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

function featuredItemHTML(ad) {
  const title = escapeHTML(ad.title);
  const hasImage = ad.images && ad.images.length > 0;
  return `
  <a class="featured-item" href="listing.html?id=${ad.id}">
    ${hasImage ? `<img src="${escapeHTML(ad.images[0])}" alt="${title}">` : ''}
    <div>
      <p class="fi-title">${title}</p>
      <span class="fi-price">${formatPrice(ad.price)}</span>
    </div>
  </a>`;
}

// ---------- Supabase (مفتاح anon — بيانات عامّة، نفس اللي بيشوفها المتصفّح) ----------

async function supabaseGet(pathAndQuery) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${(await r.text()).slice(0, 120)}`);
  return r.json();
}

// نفس استعلام getActiveAds بالمتصفّح حرفياً — عشان المتصفّح يقدر يستعمل النتيجة بدل ما يعيدها
async function fetchActiveAdRows() {
  const cutoff = new Date(Date.now() - AD_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return supabaseGet(`ads?select=*&created_at=gte.${encodeURIComponent(cutoff)}&order=created_at.desc`);
}

async function fetchAdRowById(id) {
  const rows = await supabaseGet(`ads?select=*,profiles!ads_owner_id_fkey(created_at)&id=eq.${encodeURIComponent(id)}`);
  return rows[0] || null;
}

async function fetchCommentCounts() {
  const rows = await supabaseGet('comments?select=ad_id');
  const map = {};
  rows.forEach((r) => { map[r.ad_id] = (map[r.ad_id] || 0) + 1; });
  return map;
}

// ---------- قراءة القالب ----------
// الملفات المضمّنة (included_files بـnetlify.toml) بتوصل بمسار نسبي من جذر
// الموقع، بس مكان الجذر بيختلف بين البيئة المحلية وNetlify — فمنجرّب المرشّحين.
const fs = require('fs');
const path = require('path');
function readTemplate(name) {
  const candidates = [
    path.resolve(process.cwd(), name),
    path.resolve(__dirname, '..', '..', '..', name),
    path.resolve(process.env.LAMBDA_TASK_ROOT || '', name),
  ];
  for (const p of candidates) {
    try { return fs.readFileSync(p, 'utf8'); } catch (e) { /* جرّب التالي */ }
  }
  throw new Error(`template not found: ${name} (tried ${candidates.join(', ')})`);
}

// ---------- حقن بالقالب ----------

function setTag(html, regex, replacement) {
  return regex.test(html) ? html.replace(regex, replacement) : html;
}

function injectHead(html, { title, desc, canonical, ogTitle, ogDesc, ogImage, ogUrl, noindex }) {
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${escapeHTML(title)}</title>`);
  html = setTag(html, /<meta name="description"( id="[^"]*")? content="[^"]*">/,
    `<meta name="description"$1 content="${escapeHTML(desc)}">`);
  html = setTag(html, /<meta property="og:title"( id="[^"]*")? content="[^"]*">/,
    `<meta property="og:title"$1 content="${escapeHTML(ogTitle || title)}">`);
  html = setTag(html, /<meta property="og:description"( id="[^"]*")? content="[^"]*">/,
    `<meta property="og:description"$1 content="${escapeHTML(ogDesc || desc)}">`);
  if (ogImage) html = setTag(html, /<meta property="og:image"( id="[^"]*")? content="[^"]*">/,
    `<meta property="og:image"$1 content="${escapeHTML(ogImage)}">`);
  if (ogUrl) html = setTag(html, /<meta property="og:url"( id="[^"]*")? content="[^"]*">/,
    `<meta property="og:url"$1 content="${escapeHTML(ogUrl)}">`);
  if (canonical) html = setTag(html, /<link rel="canonical"( id="[^"]*")? href="[^"]*">/,
    `<link rel="canonical"$1 href="${escapeHTML(canonical)}">`);
  if (noindex) html = html.replace('</head>', '<meta name="robots" content="noindex">\n</head>');
  return html;
}

// بيستبدل محتوى عنصر بمعرّف معيّن (بيتعامل مع العناصر المتداخلة بعمق واحد كافي لقوالبنا)
function replaceInner(html, id, inner) {
  const open = new RegExp(`(<(\\w+)[^>]*\\sid="${id}"[^>]*>)`);
  const m = html.match(open);
  if (!m) return html;
  const start = m.index + m[0].length;
  const tag = m[2];
  // نلاقي إغلاق العنصر نفسه بعدّ الفتح/الإغلاق لنفس الوسم
  let depth = 1, i = start;
  const re = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g');
  re.lastIndex = start;
  let mm;
  while ((mm = re.exec(html)) !== null) {
    if (mm[0][1] === '/') depth--; else if (!mm[0].endsWith('/>')) depth++;
    if (depth === 0) { i = mm.index; break; }
  }
  return html.slice(0, start) + inner + html.slice(i);
}

// البيانات للمتصفّح: بيقراها app.js بدل ما يعيد الاستعلام
function injectSSRData(html, data) {
  const tag = `<script>window.__SSR__=${jsonForScript(data)};</script>\n`;
  const idx = html.indexOf('<script src=');
  return idx === -1 ? html.replace('</body>', tag + '</body>') : html.slice(0, idx) + tag + html.slice(idx);
}

const CACHE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  // المتصفّح: دايماً يسأل. الحافة (CDN): دقيقتين، وبعدها يخدم القديم بينما يجدّد بالخلفية.
  // هيك جوجل والزوّار ما بيشغّلوا الدالة بكل طلب، والإعلان الجديد بيبيّن خلال دقيقتين.
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
};

module.exports = {
  escapeHTML, jsonForScript, timeAgo, memberSinceLabel, formatPrice, mapAdRow,
  adCardHTML, featuredItemHTML, ICONS,
  fetchActiveAdRows, fetchAdRowById, fetchCommentCounts,
  readTemplate, injectHead, replaceInner, injectSSRData, CACHE_HEADERS,
};
