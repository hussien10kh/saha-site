/* رسم صفحة الإعلانات على السيرفر — /ads.html و /ads.html?cat=…&city=…&q=…

   قبل: الـHTML بيوصل فاضي (هياكل تحميل)، وبعدين المتصفّح بيجيب الإعلانات من
   Supabase وبيرسمها. جوجل بيقدر يرسم JS بس أبطأ وأقل موثوقية — وصفحات
   "سيارات للبيع في دمشق" كانت بتوصله بلا ولا إعلان جوّاتها.

   بعد: هالدالة بتقرا ads.html كقالب، بتجيب نفس الإعلانات بنفس الاستعلام،
   بتحقن العنوان والوصف والبطاقات جاهزين، وبتمرّر البيانات للمتصفّح بـ
   window.__SSR__ حتى ما يعيد الاستعلام. نفس الـHTML لجوجل وللزوّار — ما في
   نسختين.

   لو أي شي فشل (Supabase وقع، القالب ما انقرا) بترجع القالب كما هو: الصفحة
   بترجع لسلوكها القديم (المتصفّح بيرسم) بدل ما تنكسر. */

const R = require('./lib/render.js');
const SEO = require('../../js/seo-config.js');

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const cat = (qs.cat || '').trim();
  const city = (qs.city || '').trim();
  const q = (qs.q || '').trim();

  let html;
  try { html = R.readTemplate('ads.html'); }
  catch (err) {
    console.error('ssr-ads: template', err);
    return { statusCode: 500, body: 'template error' };
  }

  let rows, commentCounts;
  try {
    [rows, commentCounts] = await Promise.all([R.fetchActiveAdRows(), R.fetchCommentCounts()]);
  } catch (err) {
    console.error('ssr-ads: data', err);
    return { statusCode: 200, headers: R.CACHE_HEADERS, body: html };   // القالب الخام — المتصفّح بيكمّل
  }

  const all = rows.map(R.mapAdRow);

  // نفس فلترة loadFeed بالمتصفّح حرفياً
  let ads = all;
  if (cat) ads = ads.filter((a) => a.category === cat);
  if (city) ads = ads.filter((a) => (a.city || '').includes(city));
  if (q) {
    const needle = q.toLowerCase();
    ads = ads.filter((a) => (a.title + a.description + a.city).toLowerCase().includes(needle));
  }

  // ---------- head ----------
  const seo = SEO.pageSeo({ cat, city, q });
  html = R.injectHead(html, {
    title: seo.title, desc: seo.desc, canonical: seo.canonical, noindex: !!seo.noindex,
    ogUrl: seo.canonical,
  });

  // ---------- h1 + عدّاد النتائج ----------
  html = R.replaceInner(html, 'pageHeading', R.escapeHTML(seo.h1));
  if (cat || q || city) {
    const label = cat ? (SEO.CATEGORY_LABELS[cat] || '') : '';
    const info = `${ads.length} نتيجة`
      + (label ? ` في «${label}»` : '')
      + (city ? ` في مدينة «${city}»` : '')
      + (q ? ` لكلمة «${q}»` : '');
    html = R.replaceInner(html, 'resultsInfo', R.escapeHTML(info))
      .replace('id="resultsInfo" style="display:none;', 'id="resultsInfo" style="display:block;');
  }

  // ---------- البطاقات ----------
  if (ads.length) {
    html = R.replaceInner(html, 'feed', ads.map(R.adCardHTML).join(''));
  } else {
    // نفس حالة "ما في نتائج" بالمتصفّح: نخفي التغذية ونظهر الرسالة
    html = R.replaceInner(html, 'feed', '')
      .replace('<div class="feed" id="feed">', '<div class="feed" id="feed" style="display:none;">')
      .replace('id="emptyState" style="display:none;"', 'id="emptyState" style="display:block;"');
    if (cat || q || city) {
      html = R.replaceInner(html, 'emptyTitle', 'لا توجد إعلانات مطابقة')
        .replace(/(<p id="emptyText">)[^<]*(<\/p>)/, '$1جرّب تعديل كلمة البحث أو اختيار تصنيف آخر.$2');
    }
  }

  // ---------- الشريط الجانبي (إعلانات مميزة) — نفس ترتيب renderFeaturedSidebar ----------
  const score = (a) => (a.views || 0) + ((commentCounts[a.id]) || 0) * 3;
  const featured = all.slice()
    .sort((a, b) => score(b) - score(a) || (new Date(b.createdAt)) - (new Date(a.createdAt)))
    .slice(0, 7);
  html = R.replaceInner(html, 'featuredList', featured.map(R.featuredItemHTML).join(''));

  // ---------- البيانات للمتصفّح ----------
  html = R.injectSSRData(html, { ads: rows, commentCounts });

  return { statusCode: 200, headers: R.CACHE_HEADERS, body: html };
};
