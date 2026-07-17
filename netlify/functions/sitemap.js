/* Generates sitemap.xml on every request by querying the live ads table,
   so every active ad is discoverable by search engines automatically —
   no manual step needed when a new ad is posted. Falls back to just the
   static pages if the Supabase query fails for any reason. */

const SITE_URL = 'https://saaha.net';
const SUPABASE_URL = 'https://uijijqkbctemcfdzoxlg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fKElveNWpcfKrcC9GBjo4Q_48S5m2EK';
const AD_EXPIRY_DAYS = 90;

const STATIC_PAGES = [
  { loc: '/index.html', changefreq: 'hourly', priority: '1.0' },
  { loc: '/add-ad.html', changefreq: 'monthly', priority: '0.6' },
  { loc: '/about.html', changefreq: 'monthly', priority: '0.4' },
  { loc: '/faq.html', changefreq: 'monthly', priority: '0.4' },
  { loc: '/contact.html', changefreq: 'monthly', priority: '0.4' },
  { loc: '/privacy.html', changefreq: 'yearly', priority: '0.2' },
  { loc: '/terms.html', changefreq: 'yearly', priority: '0.2' },
];

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

  const staticEntries = STATIC_PAGES.map(p => `
  <url>
    <loc>${SITE_URL}${p.loc}</loc>
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
