// ===== Meta Pixel — ساحة (ads + tourism + malaab) =====
// نظام موحّد لتتبّع Funnel المستخدم عبر كل الأقسام:
//   PageView → ViewContent → Search → Register → AddListing → ContactSeller
//
// كل event بيحمل بارامترات غنيّة (city, governorate, category, section) عشان
// تعرف مثلاً "أي محافظة جلبت مستخدمين تسجّلوا فعلاً" مو بس "أي محافظة جلبت نقرات".
//
// الاستخدام:
//   <script src="js/meta-pixel.js"></script>   ← تلقائياً بيعمل PageView (بعد الموافقة)
//   MetaPixel.viewContent({ id, name, category, city, governorate, price, section });
//   MetaPixel.search({ query, category, governorate, city, section });
//   MetaPixel.register({ method });
//   MetaPixel.addListing({ type, category, governorate, city, section });
//   MetaPixel.contactSeller({ id, section, category, governorate, city, method });
//   MetaPixel.wireContactLinks(rootEl, ctxObjOrFn);  ← يمسك كل روابط tel:/wa.me تلقائياً
//
// ============================================================
//
// لازم تحدّث META_PIXEL_ID برقم الـPixel الحقيقي من Business Manager
//     Events Manager → Data Sources → Pixel → ID (15-16 خانة رقم)
//
// لو خلّيته على 'YOUR_PIXEL_ID' — الكود بيصير no-op وما بيبعت شي (وضع تطوير آمن)،
// بس بيطبع كل event للـconsole عشان تشوف الـfunnel شغّال محلياً.
//
// ============================================================

const META_PIXEL_ID = '1550849640101362';

// Conversions API — نسخة server-side من نفس الأحداث (نفس event_id → Meta بيلغي التكرار).
// خلّيه false لحد ما تنشر netlify/functions/meta-capi.js وتحطّ الـAccess Token بمتغيرات Netlify،
// وإلا كل event رح يعمل طلب فاشل 404 بلا فائدة.
const META_CAPI_ENABLED = false;
const META_CAPI_ENDPOINT = '/.netlify/functions/meta-capi';

// مفتاح قرار الكوكيز — الـPixel ما بينحمّل إلا بعد موافقة صريحة.
const META_CONSENT_KEY = 'saaha:consent:v1';

/* تصفّح التطوير ما بينحسب. بلا هالحارس كل reload على localhost بيبعت تحويل
   حقيقي لحساب الإعلانات، وMeta بيتعلّم من بيانات مو حقيقية — يعني تحسين الحملات
   بينحرف من قبل ما تبلّش. للفحص المتعمّد محلياً: أضف ?pixel_debug=1 للرابط. */
const _MP_LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', ''];
function _mpIsDevHost() {
  if (location.search.indexOf('pixel_debug=1') !== -1) return false;
  return _MP_LOCAL_HOSTS.indexOf(location.hostname) !== -1
    || location.protocol === 'file:';
}

// نلحق event_id فريد لكل event عشان نمنع التكرار بين الـPixel والـCAPI (deduplication)
function _mpEventId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const MetaPixel = (() => {
  const enabled = META_PIXEL_ID && /^\d{15,16}$/.test(META_PIXEL_ID) && !_mpIsDevHost();

  let booted = false;
  // أحداث انطلقت قبل ما ياخد المستخدم قراره بالكوكيز — بننطرها بالذاكرة
  // وبنطلقها كلها لو وافق. لو رفض بنرميها. سقف 25 عشان ما تتضخّم.
  const pending = [];
  const PENDING_MAX = 25;

  // ---------- الموافقة ----------

  function consentState() {
    try { return localStorage.getItem(META_CONSENT_KEY) || 'unset'; }
    catch (e) { return 'unset'; }   // متصفح بوضع خاص → نعتبره غير محسوم
  }

  function _persistConsent(v) {
    try { localStorage.setItem(META_CONSENT_KEY, v); } catch (e) {}
  }

  function grantConsent() {
    _persistConsent('granted');
    _bootPixel();
    // نفرّغ الطابور بنفس ترتيب حدوثه (PageView أول شي)
    const queued = pending.splice(0, pending.length);
    queued.forEach((ev) => _send(ev));
    document.dispatchEvent(new CustomEvent('metapixel:consent', { detail: { state: 'granted' } }));
  }

  function denyConsent() {
    _persistConsent('denied');
    pending.length = 0;
    document.dispatchEvent(new CustomEvent('metapixel:consent', { detail: { state: 'denied' } }));
  }

  // ---------- تحميل الـPixel ----------

  // بوت Meta Pixel القياسي — يحمّل fbevents.js من Facebook
  function _bootPixel() {
    if (!enabled || booted || window.fbq) { booted = true; return; }
    booted = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', META_PIXEL_ID);
    _addNoscriptPixel();
  }

  // noscript pixel — Facebook يوصي فيه للـconversion tracking بلا JS.
  // بينضاف بس بعد الموافقة، مو على طول (وإلا بيصير tracking قبل الموافقة).
  function _addNoscriptPixel() {
    if (document.getElementById('mp-noscript')) return;
    const ns = document.createElement('noscript');
    ns.id = 'mp-noscript';
    ns.innerHTML = '<img height="1" width="1" style="display:none" alt="" '
      + 'src="https://www.facebook.com/tr?id=' + META_PIXEL_ID + '&ev=PageView&noscript=1"/>';
    document.head.appendChild(ns);
  }

  // ---------- الإرسال ----------

  // بيشيل المفاتيح الفاضية — Meta بيتجاهل undefined وبيوسّخ تقارير التشخيص
  function _clean(obj) {
    const out = {};
    Object.keys(obj || {}).forEach((k) => {
      const v = obj[k];
      if (v !== undefined && v !== null && v !== '') out[k] = v;
    });
    return out;
  }

  function _cookie(name) {
    const m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : null;
  }

  // الإرسال الفعلي للـPixel + نسخة CAPI بنفس الـevent_id
  function _send(ev) {
    if (typeof fbq !== 'function') return;
    fbq(ev.isCustom ? 'trackCustom' : 'track', ev.name, ev.params, { eventID: ev.eventId });
    try { sessionStorage.setItem('mp:last_event_id', ev.eventId); } catch (e) {}
    _mirrorToCapi(ev);
  }

  // نسخة server-side — نفس event_id عشان Meta يدمج النسختين بدل ما يعدّهم مرتين
  function _mirrorToCapi(ev) {
    if (!META_CAPI_ENABLED) return;
    const body = JSON.stringify({
      event_name: ev.name,
      event_id: ev.eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: location.href,
      action_source: 'website',
      custom_data: ev.params,
      user_data: _clean({ fbp: _cookie('_fbp'), fbc: _cookie('_fbc') }),
    });
    // keepalive عشان الحدث ما يضيع لو المستخدم غادر الصفحة فوراً (مثلاً ضغط "اتصل")
    try {
      fetch(META_CAPI_ENDPOINT, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});
    } catch (e) {}
  }

  // Wrapper: بيتحقق من التفعيل + الموافقة قبل ما يبعت
  function _fire(eventName, params = {}, isCustom = false) {
    const eventId = params.event_id || _mpEventId();
    const cleanParams = _clean(params); delete cleanParams.event_id;

    if (!enabled) {
      // Dev mode: طبّع للـconsole عشان نعرف شو كان رح ينبعت
      console.log('[MetaPixel dev] ' + (isCustom ? 'trackCustom' : 'track') + ':', eventName, cleanParams);
      return;
    }

    const ev = { name: eventName, params: cleanParams, isCustom, eventId };
    const state = consentState();

    if (state === 'granted') { _bootPixel(); _send(ev); return; }
    if (state === 'denied') return;                       // المستخدم رفض — ما منتتبّع أبداً
    if (pending.length < PENDING_MAX) pending.push(ev);   // لسه ما قرّر — منستنّى
  }

  // ---------- استنتاج القسم من المسار ----------
  // بيوفّر تمرير section يدوياً بكل صفحة، وبيضمن ما ينسى حدا يمرّره.
  function section() {
    const p = location.pathname;
    if (p.indexOf('/malaab/') !== -1) return 'malaab';
    if (p.indexOf('/tourism/') !== -1) return 'tourism';
    return 'ads';
  }

  // ---------- Events القياسية ----------

  // PageView — تلقائي على كل صفحة (Meta بيعرف الـURL من مكانه)
  function pageView() { _fire('PageView', { content_type: section() }); }

  // ViewContent — لما المستخدم يفتح صفحة تفاصيل (ملعب/مكان/إعلان)
  //
  // ملاحظة على content_type مقابل listing_type: القسم (ads|tourism|malaab) بيضل
  // بـcontent_type لأنه هوّي المستوى اللي منقارن فيه الحملات. النوع الفرعي
  // (venue/coach/talent/…) بيروح بـlisting_type — لو حطّيناه بمكان القسم منخسر
  // القدرة نشوف "ملاعب" كوحدة وحدة مقابل "إعلانات" و"سياحة".
  function viewContent({ id, name, category, city, governorate, price, currency = 'SYP', section: sec, type } = {}) {
    _fire('ViewContent', {
      content_ids: id ? [String(id)] : undefined,
      content_name: name,
      content_category: category,
      content_type: sec || section(),        // ads|tourism|malaab
      listing_type: type,                    // venue|coach|academy|talent|match|training|event|place|ad
      value: price || undefined,
      currency: price ? currency : undefined,
      city, governorate,                     // custom params — Meta بيمرّرهم للتحليلات
    });
  }

  // Search — لما المستخدم يستخدم البحث/الفلاتر
  function search({ query, category, governorate, city, section: sec, type } = {}) {
    _fire('Search', {
      search_string: query || '',
      content_category: category,
      content_type: sec || section(),
      listing_type: type,
      city, governorate,
    });
  }

  // CompleteRegistration — بعد نجاح تسجيل حساب
  function register({ method = 'email', section: sec } = {}) {
    _fire('CompleteRegistration', {
      registration_method: method,
      content_type: sec || section(),
      status: true,
    });
  }

  // AddListing — إضافة إعلان/ملعب/موهبة/مباراة (Lead بمصطلح Meta)
  // بنستعمل Lead كنوع event قياسي عشان Meta يقدر يحسّن الحملات عليه
  function addListing({ type, category, governorate, city, section: sec } = {}) {
    _fire('Lead', {
      content_name: type || sec || section(),  // نوع الإضافة (venue/place/talent/…)
      content_category: category,
      content_type: sec || section(),
      listing_type: type,
      city, governorate,
    });
  }

  // ContactSeller — لما المستخدم يضغط "اتصل" أو "واتساب" أو رقم الجوال
  // نستعمل Contact كـstandard event
  function contactSeller({ id, section: sec, category, governorate, city, type, method = 'phone' } = {}) {
    _fire('Contact', {
      content_ids: id ? [String(id)] : undefined,
      content_type: sec || section(),
      content_category: category,
      listing_type: type,
      contact_method: method,                  // phone|whatsapp|directions|form|…
      city, governorate,
    });
  }

  // Booking — بدء حجز ملعب
  function booking({ id, section: sec, price, governorate, city, type } = {}) {
    _fire('InitiateCheckout', {
      content_ids: id ? [String(id)] : undefined,
      content_type: sec || section(),
      listing_type: type,
      value: price || undefined,
      currency: price ? 'SYP' : undefined,
      city, governorate,
    });
  }

  // Favorite — إضافة للمفضلة
  function favorite({ id, section: sec, category, type } = {}) {
    _fire('AddToWishlist', {
      content_ids: id ? [String(id)] : undefined,
      content_type: sec || section(),
      content_category: category,
      listing_type: type,
    });
  }

  // ---------- ربط أزرار التواصل تلقائياً ----------
  // بدل ما نلاحق كل زر "اتصل"/"واتساب" بكل صفحة (وننسى الجديد اللي بينضاف لاحقاً)،
  // منستخدم delegation على عنصر أب: أي <a href="tel:…"> أو wa.me جوّاته بينمسك تلقائياً.
  // ctx ممكن يكون object أو function بترجّع object (لأن العنصر ممكن ينبنى بعدين).
  //
  //   MetaPixel.wireContactLinks(document, { id: ad.id, city: ad.city, category: ad.category });
  function wireContactLinks(root, ctx) {
    const el = root || document;
    if (!el || el.__mpContactWired) return;
    el.__mpContactWired = true;

    el.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      const href = a.getAttribute('href') || '';

      let method = null;
      if (href.indexOf('tel:') === 0) method = 'phone';
      else if (href.indexOf('wa.me') !== -1) {
        // wa.me/?text=… هوّي زر مشاركة مو تواصل مع المعلن — منستثنيه
        method = href.indexOf('wa.me/?') !== -1 ? null : 'whatsapp';
      } else if (href.indexOf('google.com/maps/dir') !== -1) method = 'directions';

      if (!method) return;
      const data = (typeof ctx === 'function' ? ctx(a) : ctx) || {};
      contactSeller(Object.assign({}, data, { method: method }));
    }, true);   // capture: منسجّل قبل ما أي handler تاني يوقف الحدث
  }

  // ---------- Init ----------
  if (enabled) {
    if (consentState() === 'granted') _bootPixel();
    pageView();   // بينحفظ بالطابور لو الموافقة لسه ما إجت
  } else {
    console.log(_mpIsDevHost()
      ? '[MetaPixel] dev host — events logged only, nothing sent. Add ?pixel_debug=1 to send for real.'
      : '[MetaPixel] disabled — set a valid META_PIXEL_ID in js/meta-pixel.js to enable');
    pageView();   // بوضع التطوير منطبعه للـconsole عشان تشوف الـfunnel كامل
  }

  return {
    pageView, viewContent, search, register, addListing, contactSeller, booking, favorite,
    wireContactLinks, section,
    grantConsent, denyConsent, consentState,
    isEnabled: () => enabled,
  };
})();

/* منعرّضه على window كمان: المتغيّر معرّف بـconst فما بينضاف لـwindow تلقائياً،
   ومواقع الاستدعاء بتستعمل window.MetaPixel?.x() عشان لو حجب مانع إعلانات هالملف
   (اسمه فيه "pixel") تصير الاستدعاءات no-op بدل ReferenceError يكسر رندر الصفحة. */
window.MetaPixel = MetaPixel;
