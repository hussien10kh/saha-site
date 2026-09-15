/* رسم صفحة الإعلان على السيرفر — /listing.html?id=…

   بيقرا listing.html كقالب، بيجيب الإعلان، وبيحقن العنوان والوصف وOG وJSON-LD
   والمحتوى الأساسي (البائع، التواصل، العنوان، الوصف، السعر، الصور) جاهزين.
   المتصفّح بعدين بيرسم فوقهم النسخة الكاملة (مفضّلة، مشاركة، مشابهة، تعليقات)
   من نفس البيانات عبر window.__SSR__.ad — بلا استعلام تاني وبلا قفزة.

   إعلان مو موجود = 404 حقيقي مع noindex. قبل كان 200 وصفحة "غير موجود" —
   اللي جوجل بيسمّيه Soft 404. */

const R = require('./lib/render.js');
const SEO = require('../../js/seo-config.js');

const SITE = 'https://saaha.net';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// مرايا الدوال المساعدة بـapp.js (toAsciiDigits / toWhatsAppDigits / initials)
function toAsciiDigits(v) {
  if (!v) return '';
  const map = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
                '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9' };
  return String(v).replace(/[٠-٩۰-۹]/g, (d) => map[d]).replace(/\D/g, '');
}
function toWhatsAppDigits(phone) {
  let d = toAsciiDigits(phone);
  if (!d) return '';
  if (d.startsWith('0')) d = '963' + d.slice(1);
  else if (!d.startsWith('963')) d = '963' + d;
  return d;
}
const initials = (name) => (name || '؟').trim().charAt(0);

const ICON_PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>`;
const ICON_WA = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3.9A11.8 11.8 0 0 0 2.2 18.4L1 23l4.7-1.2A11.8 11.8 0 0 0 20 3.9zm-8 17.6a9.8 9.8 0 0 1-5-1.4l-.4-.2-2.8.7.8-2.7-.2-.4A9.8 9.8 0 1 1 12 21.5zm5.4-7.3c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 6 6 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.1 4.5c1.9.8 2.6.9 3.6.7a3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z"/></svg>`;

// النسخة الأساسية من renderDetail بـlisting.html — نفس البنية والأصناف
function detailCoreHTML(ad) {
  const title = R.escapeHTML(ad.title), desc = R.escapeHTML(ad.description);
  const seller = R.escapeHTML(ad.seller), city = R.escapeHTML(ad.city);
  const phoneDigits = toAsciiDigits(ad.phone);
  const hasImage = ad.images && ad.images.length > 0;

  const contact = (ad.contactMethod === 'phone' && ad.phone)
    ? `<a class="contact-btn" href="tel:${R.escapeHTML(phoneDigits)}" style="margin-bottom:0;">${ICON_PHONE}${R.escapeHTML(ad.phone)}</a>
       <a class="whatsapp-btn" href="https://wa.me/${toWhatsAppDigits(ad.phone)}" target="_blank" rel="noopener">${ICON_WA}تواصل عبر واتساب</a>`
    : `<button class="contact-btn" id="contactBtn" type="button" style="margin-bottom:0;">${ICON_PHONE}تواصل عبر الردود</button>`;

  return `
      <div class="panel detail-panel">
        <div class="seller-row">
          <div class="comment-avatar" style="width:52px;height:52px;font-size:20px;">${R.escapeHTML(initials(ad.seller))}</div>
          <div>
            <div class="seller-name">${seller}</div>
            <div class="seller-meta">${R.ICONS.pin}${city} &nbsp;·&nbsp; عضو منذ ${R.escapeHTML(ad.memberSince)}</div>
          </div>
        </div>

        <div class="contact-row">${contact}</div>

        <div class="detail-title-row" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <h1 class="detail-title" style="margin:0;">${title}</h1>
        </div>
        <div class="detail-sub">
          <span>نشر ${R.escapeHTML(ad.postedAgo)}</span>
          <span>${R.ICONS.eye}${ad.views} مشاهدة</span>
        </div>

        <p class="detail-desc">${desc}</p>

        <div style="margin-top:4px;margin-bottom:8px;">
          <span class="price-tag">${R.formatPrice(ad.price)}</span>
        </div>

        ${hasImage ? `
        <div class="gallery-main"><img id="mainImg" src="${R.escapeHTML(ad.images[0])}" alt="${title}"></div>
        <div class="gallery-thumbs" id="thumbs">
          ${ad.images.map((src, i) => `<img src="${R.escapeHTML(src)}" class="${i === 0 ? 'active' : ''}" data-i="${i}" alt="${title} - صورة ${i + 1}">`).join('')}
        </div>` : ''}
      </div>`;
}

const NOT_FOUND_HTML = `
      <div class="panel empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v5M12 16h.01"/><circle cx="12" cy="12" r="9"/></svg>
        <h3>هذا الإعلان غير موجود</h3>
        <p>ربما تم حذفه أو أن الرابط غير صحيح.</p>
        <a class="btn btn-primary" href="ads.html" style="margin-top:12px;">العودة للرئيسية</a>
      </div>`;

exports.handler = async (event) => {
  const id = ((event.queryStringParameters || {}).id || '').trim();

  let html;
  try { html = R.readTemplate('listing.html'); }
  catch (err) {
    console.error('ssr-listing: template', err);
    return { statusCode: 500, body: 'template error' };
  }

  // معرّف مشوّه أو فاضي: 404 فوراً بلا استعلام (نفس منطق getAdById بالمتصفّح)
  if (!UUID_RE.test(id)) {
    html = R.injectHead(html, { title: 'الإعلان غير موجود | ساحة', desc: 'هذا الإعلان غير موجود أو تم حذفه.', noindex: true });
    html = R.replaceInner(html, 'detailRoot', NOT_FOUND_HTML);
    // بلا window.__SSR__ هون: صفحة "غير موجود" بيعيد المتصفّح فيها استعلامه العادي — لو كانت النسخة
    // المخزّنة بالحافة قديمة (عنصر انعتمد قبل شوي) بيلاقيه، وما منقفل عليه بنتيجة السيرفر.
    return { statusCode: 404, headers: R.CACHE_HEADERS, body: html };
  }

  let row;
  try { row = await R.fetchAdRowById(id); }
  catch (err) {
    console.error('ssr-listing: data', err);
    return { statusCode: 200, headers: R.CACHE_HEADERS, body: html };   // القالب الخام — المتصفّح بيكمّل
  }

  if (!row) {
    html = R.injectHead(html, { title: 'الإعلان غير موجود | ساحة', desc: 'هذا الإعلان غير موجود أو تم حذفه.', noindex: true });
    html = R.replaceInner(html, 'detailRoot', NOT_FOUND_HTML);
    return { statusCode: 404, headers: R.CACHE_HEADERS, body: html };
  }

  const ad = R.mapAdRow(row);
  const pageUrl = `${SITE}/listing.html?id=${ad.id}`;
  const shortDesc = ad.description.length > 155 ? ad.description.slice(0, 152) + '...' : ad.description;
  const catLabel = SEO.CATEGORY_LABELS[ad.category] || ad.category;

  // ---------- head + JSON-LD (نفس اللي بيبنيه المتصفّح) ----------
  html = R.injectHead(html, {
    title: `${ad.title} | ساحة`, desc: shortDesc, canonical: pageUrl, ogUrl: pageUrl,
    ogImage: ad.images[0] || `${SITE}/icon-512.png`,
  });
  const productLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: ad.title, description: ad.description,
    ...(ad.images.length ? { image: ad.images } : {}),
    category: catLabel,
    offers: { '@type': 'Offer', url: pageUrl, priceCurrency: 'SYP', price: ad.price || undefined,
      availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/UsedCondition' },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: catLabel, item: `${SITE}/ads.html?cat=${ad.category}` },
      { '@type': 'ListItem', position: 3, name: ad.title, item: pageUrl },
    ],
  };
  html = R.replaceInner(html, 'jsonLd', R.jsonForScript(productLd));
  html = R.replaceInner(html, 'breadcrumbLd', R.jsonForScript(breadcrumbLd));

  // ---------- المحتوى ----------
  html = R.replaceInner(html, 'detailRoot', detailCoreHTML(ad));
  html = R.injectSSRData(html, { ad: row });

  return { statusCode: 200, headers: R.CACHE_HEADERS, body: html };
};
