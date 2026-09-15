/* رسم صفحة المكان السياحي على السيرفر — /tourism/place.html?id=…

   نفس نمط ssr-listing.js: قالب + استعلام + حقن. المصدر مزدوج متل المتصفّح
   بالضبط: UUID → Supabase (tourism_places، المعتمد فقط)، وغيره → المعالم
   الخمسة الثابتة بـplaces-data.js. المتصفّح بياخد السجل من window.__SSR__.place
   عبر tourismGetPlaceById وما بيعيد الاستعلام. */

const R = require('./lib/render.js');
const path = require('path');

const SITE = 'https://saaha.net';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_META = {
  landmark: { icon: '🏛', label: 'معالم' },
  cafe:     { icon: '☕', label: 'مقاهي' },
  shop:     { icon: '🛍', label: 'متاجر' },
  garden:   { icon: '🌳', label: 'حدائق' },
  food:     { icon: '🍽', label: 'مطاعم' },
};

// places-data.js ملف متصفّح (var PLACES_DATA = [...]) — منقيّمه بمجال معزول
function loadStaticPlaces() {
  const src = R.readTemplate(path.join('tourism', 'places-data.js'));
  const vm = require('vm');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.__out = PLACES_DATA;', ctx);
  return Array.isArray(ctx.__out) ? ctx.__out : [];
}

// مرايا helpers.js: tourismNormalizeCategory / tourismLocalImage / tourismRowToPlace
const normCat = (c) => (c === 'restaurant' ? 'food' : (c || 'landmark'));
const localImage = (src) => (!src ? 'header/hero-umayyad.jpg'
  : String(src).indexOf('http') === 0 ? src : String(src).replace(/^images\//, ''));
function rowToPlace(row) {
  const images = Array.isArray(row.images) ? row.images : [];
  const image = images[0] || row.image || 'header/hero-umayyad.jpg';
  return {
    id: row.id, name: row.name || 'مكان سياحي', category: normCat(row.category),
    city: row.city || row.region || 'سوريا', area: row.address || row.city || row.region || 'سوريا',
    lat: Number(row.lat || row.latitude) || 34.8, lng: Number(row.lng || row.longitude) || 37.0,
    image: localImage(image), desc: row.description || row.desc || '',
    videoUrl: row.video_url || row.videoUrl || '', status: row.status || 'approved',
  };
}
const imageUrl = (img) => (String(img).indexOf('http') === 0 ? img : `${SITE}/tourism/images/${img}`);

// النسخة الأساسية من رندر place.html: الهيرو والوصف (الخريطة والتقييمات بتجي من المتصفّح)
function placeCoreHTML(p) {
  const meta = CATEGORY_META[p.category] || { icon: '📍', label: '' };
  const bg = String(p.image).indexOf('http') === 0 ? p.image : 'images/' + p.image;
  return `
    <div class="p-hero" style="background-image:url('${R.escapeHTML(bg)}');">
      <div class="p-hero-inner">
        <h1>${R.escapeHTML(p.name)}</h1>
        <div class="p-hero-meta"><span>📍 ${R.escapeHTML(p.area)}</span><span>${meta.icon} ${meta.label}</span></div>
      </div>
    </div>
    <div class="p-content">
      <div>
        <div class="p-section"><p class="p-desc">${R.escapeHTML(p.desc)}</p></div>
      </div>
    </div>`;
}

const NOT_FOUND = '<div class="p-notfound"><h2>ما لقينا هالمكان</h2><p>تأكد من الرابط أو <a href="index.html">ارجع للتصفح</a>.</p></div>';

exports.handler = async (event) => {
  const id = ((event.queryStringParameters || {}).id || '').trim();

  let html;
  try { html = R.readTemplate(path.join('tourism', 'place.html')); }
  catch (err) { console.error('ssr-place: template', err); return { statusCode: 500, body: 'template error' }; }

  const notFound = () => {
    html = R.injectHead(html, { title: 'المكان غير موجود | ساحة سياحة', desc: 'هذا المكان غير موجود أو تم حذفه.', noindex: true });
    html = R.replaceInner(html, 'pRoot', NOT_FOUND);
    // بلا window.__SSR__ هون: صفحة "غير موجود" بيعيد المتصفّح فيها استعلامه العادي — لو كانت النسخة
    // المخزّنة بالحافة قديمة (عنصر انعتمد قبل شوي) بيلاقيه، وما منقفل عليه بنتيجة السيرفر.
    return { statusCode: 404, headers: R.CACHE_HEADERS, body: html };
  };
  if (!id) return notFound();

  let place = null, rawRow = null;
  try {
    if (UUID_RE.test(id)) {
      const rows = await R.supabaseGet(`tourism_places?select=*&id=eq.${encodeURIComponent(id)}&status=eq.approved`);
      rawRow = rows[0] || null;
      if (rawRow) place = rowToPlace(rawRow);
    } else {
      const local = loadStaticPlaces().find((p) => p.id === id);
      if (local) { rawRow = local; place = rowToPlace(local); }
    }
  } catch (err) {
    console.error('ssr-place: data', err);
    return { statusCode: 200, headers: R.CACHE_HEADERS, body: html };   // القالب الخام — المتصفّح بيكمّل
  }
  if (!place) return notFound();

  const pageUrl = `${SITE}/tourism/place.html?id=${encodeURIComponent(place.id)}`;
  const meta = CATEGORY_META[place.category] || { label: 'مكان سياحي' };
  const desc = `${place.name} — ${place.desc || 'مكان سياحي في ' + place.city + ', سوريا.'} استعرض الوصف، الخريطة، والاتجاهات على ساحة سياحة.`;

  html = R.injectHead(html, {
    title: `${place.name} | ساحة سياحة`, desc, canonical: pageUrl, ogUrl: pageUrl,
    ogImage: imageUrl(place.image),
  });
  // place.html ما فيه وسوم og — منضيفهم للمشاركة على فيسبوك/واتساب
  if (!/property="og:title"/.test(html)) {
    html = html.replace('</head>',
      `<meta property="og:type" content="place">\n<meta property="og:title" content="${R.escapeHTML(place.name + ' | ساحة سياحة')}">\n`
      + `<meta property="og:description" content="${R.escapeHTML(desc)}">\n<meta property="og:image" content="${R.escapeHTML(imageUrl(place.image))}">\n`
      + `<meta property="og:url" content="${R.escapeHTML(pageUrl)}">\n</head>`);
  }
  const ld = {
    '@context': 'https://schema.org', '@type': 'TouristAttraction',
    name: place.name, description: place.desc, url: pageUrl, image: imageUrl(place.image),
    address: { '@type': 'PostalAddress', addressLocality: place.city, addressCountry: 'SY' },
    geo: { '@type': 'GeoCoordinates', latitude: place.lat, longitude: place.lng },
    additionalType: meta.label,
  };
  html = html.replace('</head>', `<script type="application/ld+json">${R.jsonForScript(ld)}</script>\n</head>`);

  html = R.replaceInner(html, 'pRoot', placeCoreHTML(place));
  html = R.injectSSRData(html, { place: rawRow });
  return { statusCode: 200, headers: R.CACHE_HEADERS, body: html };
};
