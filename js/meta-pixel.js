// ===== Meta Pixel — ساحة (ads + tourism + malaab) =====
// نظام موحّد لتتبّع Funnel المستخدم عبر كل الأقسام:
//   PageView → ViewContent → Search → Register → AddListing → ContactSeller
//
// كل event بيحمل بارامترات غنيّة (city, governorate, category, price) عشان
// تعرف مثلاً "أي مدينة جلبت مستخدمين تسجّلوا فعلاً" مو بس "أي مدينة جلبت نقرات".
//
// الاستخدام:
//   <script src="js/meta-pixel.js"></script>   ← تلقائياً بينزل fbevents ويعمل PageView
//   MetaPixel.viewContent({ id, name, category, city, governorate, price });
//   MetaPixel.search({ query, category, governorate });
//   MetaPixel.register({ method });
//   MetaPixel.addListing({ type, category, governorate, city });
//   MetaPixel.contactSeller({ id, section, governorate });
//
// ============================================================
//
// ⚠️ لازم تحدّث META_PIXEL_ID برقم الـPixel الحقيقي من Business Manager
//     Events Manager → Data Sources → Pixel → ID (16 خانة رقم)
//
// لو خلّيته على 'YOUR_PIXEL_ID' — الكود بيصير no-op وما بيبعت شي (وضع تطوير آمن).
//
// ============================================================

const META_PIXEL_ID = 'YOUR_PIXEL_ID';

// نلحق event_id فريد لكل event عشان لاحقاً نمنع التكرار مع CAPI (deduplication)
function _mpEventId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const MetaPixel = (() => {
  const enabled = META_PIXEL_ID && /^\d{15,16}$/.test(META_PIXEL_ID);

  // بوت Meta Pixel القياسي — يحمّل fbevents.js من Facebook
  function _bootPixel() {
    if (!enabled || window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', META_PIXEL_ID);
  }

  // Wrapper: بيتحقق من التفعيل قبل ما يبعت
  function _fire(eventName, params = {}, isCustom = false) {
    if (!enabled) {
      // Dev mode: طبّع للـconsole عشان نعرف شو كان رح ينبعت
      console.log(`[MetaPixel dev] ${isCustom ? 'trackCustom' : 'track'}:`, eventName, params);
      return;
    }
    if (typeof fbq !== 'function') return;
    const eventId = params.event_id || _mpEventId();
    const cleanParams = { ...params }; delete cleanParams.event_id;
    fbq(isCustom ? 'trackCustom' : 'track', eventName, cleanParams, { eventID: eventId });
    // نخزّن آخر event_id بالـsession عشان CAPI لاحقاً يستعمله (dedup)
    try { sessionStorage.setItem('mp:last_event_id', eventId); } catch (e) {}
  }

  // ---------- Events القياسية ----------

  // PageView — تلقائي على كل صفحة (Meta بيعرف الـURL من مكانه)
  function pageView() { _fire('PageView'); }

  // ViewContent — لما المستخدم يفتح صفحة تفاصيل (ملعب/مكان/إعلان)
  function viewContent({ id, name, category, city, governorate, price, currency = 'SYP', section } = {}) {
    _fire('ViewContent', {
      content_ids: id ? [String(id)] : undefined,
      content_name: name,
      content_category: category,
      content_type: section || category,     // section = ads|tourism|venues|coaches|academies|talents|matches|...
      value: price || undefined,
      currency: price ? currency : undefined,
      city, governorate,                     // custom params — Meta بيمرّرهم للتحليلات
    });
  }

  // Search — لما المستخدم يستخدم البحث/الفلاتر
  function search({ query, category, governorate, city, section } = {}) {
    _fire('Search', {
      search_string: query || '',
      content_category: category,
      content_type: section,
      city, governorate,
    });
  }

  // CompleteRegistration — بعد نجاح تسجيل حساب
  function register({ method = 'email' } = {}) {
    _fire('CompleteRegistration', { registration_method: method, status: true });
  }

  // AddListing — إضافة إعلان/ملعب/موهبة/مباراة (Lead بمصطلح Meta)
  // بنستعمل Lead كنوع event قياسي عشان Meta يقدر يحسّن الحملات عليه
  function addListing({ type, category, governorate, city, section } = {}) {
    _fire('Lead', {
      content_name: type || section,          // نوع الإضافة (venue/place/talent/…)
      content_category: category,
      content_type: section,
      city, governorate,
    });
  }

  // ContactSeller — لما المستخدم يضغط "اتصل" أو "واتساب" أو رقم الجوال
  // نستعمل Contact كـstandard event
  function contactSeller({ id, section, category, governorate, city, method = 'phone' } = {}) {
    _fire('Contact', {
      content_ids: id ? [String(id)] : undefined,
      content_type: section,
      content_category: category,
      contact_method: method,                  // phone|whatsapp|form|…
      city, governorate,
    });
  }

  // Booking — حجز ملعب (Lead كمان بس بمحتوى مختلف)
  function booking({ id, section, price, governorate, city } = {}) {
    _fire('InitiateCheckout', {
      content_ids: id ? [String(id)] : undefined,
      content_type: section,
      value: price || undefined,
      currency: price ? 'SYP' : undefined,
      city, governorate,
    });
  }

  // Favorite — إضافة للمفضلة
  function favorite({ id, section, category } = {}) {
    _fire('AddToWishlist', {
      content_ids: id ? [String(id)] : undefined,
      content_type: section,
      content_category: category,
    });
  }

  // ---------- Init ----------
  _bootPixel();
  // نطلق PageView تلقائياً — لو fbq لسه ما تحمّل، هو نفسه بيقعّد بـqueue وبينبعث لما يتحمّل
  if (enabled) pageView();
  else console.log(`[MetaPixel] disabled — set META_PIXEL_ID in js/meta-pixel.js to enable`);

  return {
    pageView, viewContent, search, register, addListing, contactSeller, booking, favorite,
    isEnabled: () => enabled,
  };
})();

// noscript pixel — Facebook يوصي فيه للـconversion tracking بلا JS
(function addNoscriptPixel() {
  if (META_PIXEL_ID === 'YOUR_PIXEL_ID') return;
  const ns = document.createElement('noscript');
  ns.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1"/>`;
  document.head.appendChild(ns);
})();
