/* Generates sitemap.xml on every request from the live database — active
   ads, approved tourism places (plus the five built-in landmarks) and every
   approved malaab item — so new content is discoverable automatically.
   Their detail pages are server-rendered (netlify/functions/ssr-*.js), so
   Google gets real content at each URL. Any Supabase failure degrades to
   the static pages only. */

const SITE_URL = 'https://saaha.net';
const SUPABASE_URL = 'https://uijijqkbctemcfdzoxlg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fKElveNWpcfKrcC9GBjo4Q_48S5m2EK';
const AD_EXPIRY_DAYS = 90;

const CATEGORIES = ['realestate', 'cars', 'mobiles', 'furniture', 'electronics', 'misc'];

/* Governorate capitals only (city name === governorate name in CITY_GROUPS,
   js/app.js) — these are the highest-search-volume city terms. Smaller towns
   are left out of the sitemap on purpose: most have zero or near-zero active
   ads, and listing thin/empty pages risks Google treating them as low-quality. */
const MAJOR_CITIES = ['دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'درعا', 'السويداء', 'دير الزور', 'الحسكة', 'الرقة', 'إدلب', 'القنيطرة'];

const CITY_PAGES = MAJOR_CITIES.flatMap(city => [
  { loc: `/ads.html?city=${encodeURIComponent(city)}`, changefreq: 'daily', priority: '0.7' },
  ...CATEGORIES.map(cat => ({ loc: `/ads.html?cat=${cat}&city=${encodeURIComponent(city)}`, changefreq: 'daily', priority: '0.75' })),
]);

const STATIC_PAGES = [
  { loc: '/', changefreq: 'hourly', priority: '1.0' },
  { loc: '/ads.html', changefreq: 'hourly', priority: '0.95' },
  ...CATEGORIES.map(cat => ({ loc: `/ads.html?cat=${cat}`, changefreq: 'hourly', priority: '0.9' })),
  ...CITY_PAGES,
  { loc: '/add-ad.html', changefreq: 'monthly', priority: '0.6' },
  { loc: '/about.html', changefreq: 'monthly', priority: '0.4' },
  { loc: '/faq.html', changefreq: 'monthly', priority: '0.4' },
  { loc: '/contact.html', changefreq: 'monthly', priority: '0.4' },
  { loc: '/privacy.html', changefreq: 'yearly', priority: '0.2' },
  { loc: '/terms.html', changefreq: 'yearly', priority: '0.2' },
  // السياحة
  { loc: '/tourism/index.html', changefreq: 'daily', priority: '0.8' },
  { loc: '/tourism/places.html', changefreq: 'daily', priority: '0.7' },
  { loc: '/tourism/regions.html', changefreq: 'weekly', priority: '0.6' },
  ...['landmarks', 'restaurants', 'cafes', 'gardens', 'shops'].map(p => ({ loc: `/tourism/${p}.html`, changefreq: 'weekly', priority: '0.6' })),
  // المعالم الخمسة المدمجة (tourism/places-data.js) — معرّفاتها slug ثابتة
  ...['umayyad-mosque', 'aleppo-citadel', 'krak-des-chevaliers', 'apamea', 'latakia-corniche'].map(id => ({ loc: `/tourism/place.html?id=${id}`, changefreq: 'monthly', priority: '0.7' })),
  // ملعبك
  { loc: '/malaab/index.html', changefreq: 'daily', priority: '0.8' },
  ...['venues', 'coaches', 'academies', 'talents', 'matches', 'training', 'events'].map(p => ({ loc: `/malaab/${p}.html`, changefreq: 'daily', priority: '0.6' })),
];

// المحتوى المعتمد بالسياحة وملعبك — نفس شرط العرض العام (status = approved)
// المعالم الخمسة موجودة مرتين: ثابتة بـplaces-data.js (slug — وهي اللي بتربطها القوائم)
// ومبذورة بـtourism_places (uuid). بالـsitemap منحط نسخة الـslug بس حتى ما نعطي جوجل عنوانين لنفس المكان.
const STATIC_LANDMARK_NAMES = new Set(['الجامع الأموي', 'قلعة حلب', 'قلعة الحصن', 'أفاميا', 'كورنيش اللاذقية']);
const APPROVED_SOURCES = [
  { table: 'tourism_places', page: '/tourism/place.html', select: 'id,name,created_at', skip: (r) => STATIC_LANDMARK_NAMES.has((r.name || '').trim()) },
  { table: 'malaabak_venues', page: '/malaab/venue-detail.html' },
  { table: 'malaabak_coaches', page: '/malaab/coach-detail.html' },
  { table: 'malaabak_academies', page: '/malaab/academy-detail.html' },
  { table: 'malaabak_talents', page: '/malaab/talent-detail.html' },
  { table: 'malaabak_matches', page: '/malaab/match-detail.html' },
  { table: 'malaabak_trainings', page: '/malaab/training-detail.html' },
  { table: 'malaabak_events', page: '/malaab/event-detail.html' },
];

async function fetchApprovedUrls(src){
  const url = `${SUPABASE_URL}/rest/v1/${src.table}?select=${src.select || 'id,created_at'}&status=eq.approved&order=created_at.desc&limit=2000`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if(!res.ok) throw new Error(src.table + ' fetch failed: ' + res.status);
  const rows = await res.json();
  return rows.filter(r => !(src.skip && src.skip(r))).map(r => ({ loc: `${src.page}?id=${r.id}`, lastmod: (r.created_at || '').slice(0, 10) }));
}

function escapeXml(s){
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));
}

async function fetchActiveAdUrls(){
  const cutoff = new Date(Date.now() - AD_EXPIRY_DAYS*24*60*60*1000).toISOString();
  const url = `${SUPABASE_URL}/rest/v1/ads?select=id,created_at&order=created_at.desc&created_at=gte.${cutoff}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if(!res.ok) throw new Error('supabase fetch failed: ' + res.status);
  const rows = await res.json();
  return rows.map(r => ({ loc: `/listing.html?id=${r.id}`, lastmod: r.created_at.slice(0,10) }));
}

exports.handler = async function(){
  let adUrls = [];
  try{
    adUrls = await fetchActiveAdUrls();
  }catch(e){
    // Supabase unreachable — still return a valid sitemap with just the static pages
    adUrls = [];
  }
  // كل مصدر لحاله: فشل جدول واحد ما بيسقط الباقي
  const approved = await Promise.all(APPROVED_SOURCES.map(src => fetchApprovedUrls(src).catch(() => [])));
  adUrls = adUrls.concat(...approved);

  const staticEntries = STATIC_PAGES.map(p => `
  <url>
    <loc>${SITE_URL}${escapeXml(p.loc)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

  const adEntries = adUrls.map(a => `
  <url>
    <loc>${SITE_URL}${escapeXml(a.loc)}</loc>
    <lastmod>${a.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntries}${adEntries}
</urlset>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/xml; charset=UTF-8', 'Cache-Control': 'public, max-age=1800' },
    body: xml,
  };
};
