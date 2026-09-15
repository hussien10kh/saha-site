/* رسم صفحات تفاصيل ملاعب على السيرفر — دالة وحدة للأنواع السبعة:
   /malaab/{venue,coach,academy,talent,match,training,event}-detail.html?id=…

   المتصفّح بهالصفحات بيجيب القائمة المعتمدة كاملة (DataBridge.load) وبيدوّر
   على العنصر فيها. منعمل الشي نفسه هون: نفس الاستعلام، ومنمرّر القائمة كاملة
   بـwindow.__SSR__ حتى DataBridge يستعملها بدل ما يعيد الطلب — والسلوك
   بالمتصفّح ما بيتغيّر ولا سطر (بما فيه "الأقرب" و"ذات الصلة" اللي بدها القائمة).

   اللي بينحقن: title/description/canonical/og + الفتات + هيرو الصفحة (h1،
   النوع، العنوان، الشارة). الباقي (المواصفات، الحجز، التقييمات، الخريطة)
   بيرسمه المتصفّح فوقه متل قبل. */

const R = require('./lib/render.js');
const path = require('path');

const SITE = 'https://saaha.net';

/* لكل نوع: الجدول، الصفحة، مسمّى الفتات، وكيف نطلّع الهيرو من السجل.
   الهيرو مرآة لكل *-detail.html — لو غيّرته هناك غيّره هون. */
const TYPES = {
  venue: {
    table: 'malaabak_venues', page: 'venue-detail.html', listKey: 'venues',
    crumb: { href: 'venues.html', label: 'الملاعب' },
    title: (r) => r.name,
    badge: (r) => `${(Number(r.rating_avg) || 0).toFixed(1)} ★`,
    sport: (r) => `ملعب ${r.sport || ''}`,
    address: (r) => `📍 ${r.address || (r.governorate + ' - ' + r.city)}`,
    desc: (r) => `${r.name} — ملعب ${r.sport || ''} في ${r.governorate}، ${r.city}. احجز ساعتك على ملعبك.`,
    price: (r) => r.price,
  },
  coach: {
    table: 'malaabak_coaches', page: 'coach-detail.html', listKey: 'coaches',
    crumb: { href: 'coaches.html', label: 'المدربين' },
    title: (r) => r.name,
    badge: (r) => `${(Number(r.rating_avg) || 0).toFixed(1)} ★`,
    sport: (r) => `مدرب ${r.specialty || ''}`,
    address: (r) => `📍 ${r.governorate} - ${r.city}<br>🎓 خبرة ${r.experience || 0} سنوات<br>⭐ ${r.review_count || 0} تقييم`,
    desc: (r) => `${r.name} — مدرب ${r.specialty || ''} في ${r.governorate}، خبرة ${r.experience || 0} سنوات. احجز حصتك على ملعبك.`,
    price: (r) => r.price_per_session,
  },
  academy: {
    table: 'malaabak_academies', page: 'academy-detail.html', listKey: 'academies',
    crumb: { href: 'academies.html', label: 'الأكاديميات' },
    title: (r) => r.name,
    badge: (r) => `${(Number(r.rating_avg) || 0).toFixed(1)} ★`,
    sport: (r) => (r.sports || []).join(' · '),
    address: (r) => `📍 ${r.governorate} - ${r.city}<br>👦 الفئات: ${(r.age_groups || []).join('، ')} سنة<br>👥 ${r.players || 0} لاعب مسجّل`,
    desc: (r) => `${r.name} — أكاديمية ${(r.sports || []).join('، ')} في ${r.governorate}، ${r.city}. سجّل على ملعبك.`,
    price: (r) => r.monthly_fee,
  },
  talent: {
    table: 'malaabak_talents', page: 'talent-detail.html', listKey: 'talents',
    crumb: { href: 'talents.html', label: 'المواهب' },
    title: (r) => r.name,
    badge: (r) => `${r.age || ''} سنة`,
    sport: (r) => `${r.sport || ''} · ${r.position || ''}`,
    address: (r) => `📍 ${r.governorate} - ${r.city}<br>🦶 القدم المفضلة: ${r.foot || ''}<br>🎬 ${(r.videos || []).length} فيديو`,
    desc: (r) => `${r.name} — موهبة ${r.sport || ''} (${r.position || ''}) من ${r.governorate}، ${r.age || ''} سنة. شاهد الفيديوهات على ملعبك.`,
  },
  match: {
    table: 'malaabak_matches', page: 'match-detail.html', listKey: 'matches',
    crumb: { href: 'matches.html', label: 'المباريات' },
    title: (r) => r.title,
    badge: (r) => r.sport || '',
    sport: (r) => `${r.level || ''} · الفئة ${r.age_group || 'مفتوحة'}`,
    address: (r) => `📍 ${r.venue_name || ''} - ${r.governorate} · ${r.city}<br>🗓️ ${r.day || ''}<br>🕐 ${r.time || ''}`,
    desc: (r) => `${r.title} — مباراة ${r.sport || ''} في ${r.governorate}، ${r.city}. انضم على ملعبك.`,
    price: (r) => r.fee,
  },
  training: {
    table: 'malaabak_trainings', page: 'training-detail.html', listKey: 'trainings',
    crumb: { href: 'training.html', label: 'التمارين' },
    title: (r) => r.title,
    badge: (r) => r.type || '',
    sport: (r) => `مع المدرب ${r.coach || ''}`,
    address: (r) => `📍 ${r.venue_name || ''} - ${r.governorate} · ${r.city}<br>🗓️ ${r.day || ''} · ${r.date_label || ''}<br>🕐 ${r.time || ''} (${r.period || ''})`,
    desc: (r) => `${r.title} — تمرين ${r.type || ''} في ${r.governorate}، ${r.city}. سجّل على ملعبك.`,
    price: (r) => r.fee,
  },
  event: {
    table: 'malaabak_events', page: 'event-detail.html', listKey: 'events',
    crumb: { href: 'events.html', label: 'الفعاليات' },
    title: (r) => r.title,
    badge: (r) => r.type || '',
    sport: (r) => (Number(r.fee) === 0 ? 'دخول مجاني' : `رسوم المشاركة ${Number(r.fee || 0).toLocaleString('en-US')} ل.س`),
    address: (r) => `📍 ${r.venue_name || ''} - ${r.governorate} · ${r.city}<br>🗓️ ${r.day || ''} · ${r.date_label || ''}<br>🕐 ${r.time || ''}`,
    desc: (r) => `${r.title} — ${r.type || 'فعالية'} رياضية في ${r.governorate}، ${r.city}. شارك على ملعبك.`,
    price: (r) => r.fee,
  },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esc = R.escapeHTML;

// mirror لـDetailCore.breadcrumbHTML
const breadcrumbHTML = (links) => `<p class="detail-breadcrumb">${links.map((l, i) =>
  (i ? '<span>›</span>' : '') + (l.href ? `<a href="${l.href}">${esc(l.label)}</a>` : esc(l.label))).join('')}</p>`;

// مرايا DataBridge.pickImage: أول صورة، وإلا إيموجي حسب الرياضة/النوع
const SPORT_EMOJI = {
  'كرة قدم': '⚽', 'كرة صالات': '🥅', 'كرة سلة': '🏀', 'تنس': '🎾', 'كرة طائرة': '🏐',
  'سباحة': '🏊', 'لياقة بدنية': '💪', 'حراس مرمى': '🧤', 'يوغا': '🧘', 'كروس فت': '🏋️', 'تأهيل إصابات': '🩺',
};
const TYPE_EMOJI = { 'بطولة': '🏆', 'دوري': '🥇', 'يوم رياضي': '🎉', 'مهرجان رياضي': '🎪', 'مباراة استعراضية': '⭐' };
function pickImage(r) {
  if (r.images && r.images.length) return r.images[0];
  if (r.image) return r.image;
  return SPORT_EMOJI[r.sport] || SPORT_EMOJI[r.specialty] || TYPE_EMOJI[r.type] || '🏟️';
}

function heroHTML(T, r) {
  const image = pickImage(r);
  const isUrl = /^https?:\/\//.test(String(image));
  return `
    ${breadcrumbHTML([T.crumb, { label: r.governorate }, { label: T.title(r) }])}
    <div class="detail-hero">
      <div class="detail-info">
        <div class="detail-title-row">
          <h1>${esc(T.title(r))}</h1>
          <span class="detail-rating-badge">${esc(T.badge(r))}</span>
        </div>
        <p class="detail-sport">${esc(T.sport(r))}</p>
        <p class="detail-address">${T.address(r)}</p>
      </div>
      <div class="detail-gallery">
        <div class="detail-main-img">${isUrl ? `<img class="db-img" src="${esc(image)}" alt="${esc(T.title(r))}">` : esc(image)}</div>
      </div>
    </div>`;
}

function notFoundHTML(T) {
  return `
      <div class="search-empty show">
        <div class="search-empty-icon">🔍</div>
        <p class="search-empty-title">ما لقينا هالصفحة</p>
        <p class="search-empty-hint">يمكن الرابط قديم أو العنصر انحذف.</p>
        <a href="${T.crumb.href}" class="btn btn-outline">رجوع</a>
      </div>`;
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  // النوع من المسار الأصلي (rewrite بيمرّره) أو من بارامتر صريح
  const m = /\/malaab\/([a-z]+)-detail\.html/.exec(event.path || '') || /\/malaab\/([a-z]+)-detail\.html/.exec(event.rawUrl || '');
  const type = (qs.type || (m && m[1]) || '').trim();
  const T = TYPES[type];
  if (!T) return { statusCode: 404, body: 'unknown type' };

  const id = (qs.id || '').trim();

  let html;
  try { html = R.readTemplate(path.join('malaab', T.page)); }
  catch (err) { console.error('ssr-malaab: template', err); return { statusCode: 500, body: 'template error' }; }

  // علامة تشخيص بالـHTML: بتبيّن شو وصل الدالة فعلاً من قاعدة الـrewrite (النوع والمعرّف)
  const mark = (h) => h.replace('</head>', '<!-- ssr-malaab type=' + type + ' id=' + esc(id).replace(/-{2,}/g, '-') + ' -->\n</head>');

  const notFound = () => {
    html = R.injectHead(html, { title: 'غير موجود - ملعبك', desc: 'هذا العنصر غير موجود أو تم حذفه.', noindex: true });
    html = R.replaceInner(html, 'detailRoot', notFoundHTML(T));
    // بلا window.__SSR__ هون: صفحة "غير موجود" بيعيد المتصفّح فيها استعلامه العادي — لو كانت النسخة
    // المخزّنة بالحافة قديمة (عنصر انعتمد قبل شوي) بيلاقيه، وما منقفل عليه بنتيجة السيرفر.
    return { statusCode: 404, headers: R.CACHE_HEADERS, body: mark(html) };
  };
  if (!UUID_RE.test(id)) return notFound();

  let rows;
  try {
    // نفس MalaabakAPI.list(type, {onlyApproved:true}) حرفياً
    rows = await R.supabaseGet(`${T.table}?select=*&status=eq.approved&order=created_at.desc`);
  } catch (err) {
    console.error('ssr-malaab: data', err);
    return { statusCode: 200, headers: R.CACHE_HEADERS, body: html };
  }
  const r = rows.find((x) => x.id === id);
  if (!r) return notFound();

  const pageUrl = `${SITE}/malaab/${T.page}?id=${encodeURIComponent(id)}`;
  const title = `${T.title(r)} - ملعبك`;
  const desc = T.desc(r);
  const picked = pickImage(r);
  const image = /^https?:\/\//.test(String(picked)) ? picked : `${SITE}/icon-512.png`;

  html = R.injectHead(html, { title, desc, canonical: pageUrl, ogUrl: pageUrl, ogImage: image });
  if (!/property="og:title"/.test(html)) {
    html = html.replace('</head>',
      `<meta property="og:title" content="${esc(title)}">\n<meta property="og:description" content="${esc(desc)}">\n`
      + `<meta property="og:image" content="${esc(image)}">\n<meta property="og:url" content="${esc(pageUrl)}">\n</head>`);
  }
  const ld = {
    '@context': 'https://schema.org',
    '@type': type === 'venue' ? 'SportsActivityLocation' : (type === 'match' || type === 'event' || type === 'training') ? 'SportsEvent' : 'Person',
    name: T.title(r), description: desc, url: pageUrl, image,
    address: { '@type': 'PostalAddress', addressLocality: r.city, addressRegion: r.governorate, addressCountry: 'SY' },
  };
  if (T.price && T.price(r) != null) ld.offers = { '@type': 'Offer', price: T.price(r), priceCurrency: 'SYP' };
  html = html.replace('</head>', `<script type="application/ld+json">${R.jsonForScript(ld)}</script>\n</head>`);

  html = R.replaceInner(html, 'detailRoot', heroHTML(T, r));
  html = R.injectSSRData(html, { malaab: { [T.listKey]: rows } });
  return { statusCode: 200, headers: R.CACHE_HEADERS, body: mark(html) };
};
