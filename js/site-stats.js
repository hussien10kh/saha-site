/* =========================================================
   ساحة — إحصائيات داخلية (js/site-stats.js)
   بيسجّل بقاعدة بياناتنا (جدول site_events بـSupabase) شو بيصير على الموقع
   فعلاً، لكل الأقسام (إعلانات/سياحة/ملعبك)، حتى لوحة الأدمن تعرض أرقام
   حقيقية من كل الزوار — مو من متصفّح المشرف بس متل ما كان:
     pageview  : فتح صفحة (القسم، المسار، المصدر، utm، الجهاز)
     pageleave : مغادرتها مع مدة البقاء الفعلية (الوقت اللي كانت فيه الصفحة ظاهرة)
     login / signup / post : تسجيل دخول، حساب جديد، نشر محتوى — بتنادى من الصفحات
   خصوصية: ما منخزّن IP ولا اسم ولا بريد. معرّف الجلسة بيموت مع التبويب
   (sessionStorage)، ومعرّف الزائر الثابت ما بينحفظ إلا بعد موافقة الكوكيز.
   ينحمّل بكل صفحة بعد consent-banner.js. الاستعمال من الصفحات:
     window.SiteStats.event('login', { method: 'google' })
   ========================================================= */
(function () {
  var ENDPOINT = 'https://uijijqkbctemcfdzoxlg.supabase.co/rest/v1/site_events';
  var ANON_KEY = 'sb_publishable_fKElveNWpcfKrcC9GBjo4Q_48S5m2EK';
  var CONSENT_KEY = 'saaha:consent:v1';
  var SESSION_KEY = 'saaha:stats:session';
  var VISITOR_KEY = 'saaha:stats:visitor';

  // نفس حارس التطوير تبع البكسل: localhost/file بيطبع بالكونسول بس (?stats_debug=1 بيتجاوزه)
  var isDev = location.search.indexOf('stats_debug=1') === -1 &&
    (['localhost', '127.0.0.1', '0.0.0.0', ''].indexOf(location.hostname) !== -1 || location.protocol === 'file:');

  function rnd() {
    try {
      var a = new Uint8Array(12); crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    } catch (e) { return String(Date.now()) + Math.random().toString(16).slice(2, 10); }
  }
  function store(kind, key, make) {
    try {
      var s = window[kind]; var v = s.getItem(key);
      if (!v) { v = make(); s.setItem(key, v); }
      return v;
    } catch (e) { return make(); }
  }
  var consentGranted = false;
  try { consentGranted = localStorage.getItem(CONSENT_KEY) === 'granted'; } catch (e) {}

  var sessionId = store('sessionStorage', SESSION_KEY, rnd);
  var visitorId = consentGranted ? store('localStorage', VISITOR_KEY, rnd) : null;
  var viewId = rnd();

  var path = location.pathname;
  // لوحة الأدمن وصفحات دخولها مو زيارات
  if (path.indexOf('/admin') === 0) { window.SiteStats = { event: function () {} }; return; }
  var section = /^\/tourism\//.test(path) ? 'tourism' : /^\/malaab\//.test(path) ? 'malaab' : 'ads';
  var qs = new URLSearchParams(location.search);
  var keepQ = new URLSearchParams();
  ['id', 'cat', 'city', 'q', 'type', 'edit', 'redirect'].forEach(function (k) { if (qs.get(k)) keepQ.set(k, qs.get(k)); });
  var pathWithQuery = (path + (keepQ.toString() ? '?' + keepQ.toString() : '')).slice(0, 300);

  var referrer = null;
  try {
    if (document.referrer) {
      var ru = new URL(document.referrer);
      if (ru.hostname !== location.hostname) referrer = (ru.hostname + ru.pathname).slice(0, 300);
    }
  } catch (e) {}
  var device = (navigator.userAgentData && navigator.userAgentData.mobile) ||
    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

  var base = {
    session_id: sessionId, visitor_id: visitorId, section: section,
    path: pathWithQuery, device: device,
  };
  var ua = navigator.userAgent;
  var os = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Windows/i.test(ua) ? 'windows' : /Mac OS/i.test(ua) ? 'mac' : /Linux/i.test(ua) ? 'linux' : 'other';
  var pageviewRow = {
    type: 'pageview', view_id: viewId,
    title: (document.title || '').slice(0, 200),
    referrer: referrer,
    utm_source: (qs.get('utm_source') || '').slice(0, 100) || null,
    utm_medium: (qs.get('utm_medium') || '').slice(0, 100) || null,
    utm_campaign: (qs.get('utm_campaign') || '').slice(0, 150) || null,
    meta: { os: os },
  };
  // أداء الصفحة (من Navigation Timing) — بينضاف للمشاهدة لو التحميل خلص قبل إرسالها
  function perfMeta() {
    try {
      var n = performance.getEntriesByType('navigation')[0];
      if (!n || !n.loadEventEnd) return null;
      return { ttfb_ms: Math.round(n.responseStart), dcl_ms: Math.round(n.domContentLoadedEventEnd), load_ms: Math.round(n.loadEventEnd) };
    } catch (e) { return null; }
  }
  var pageviewSent = false;
  function sendPageview(keepalive) {
    if (pageviewSent) return; pageviewSent = true;
    var p = perfMeta(); if (p) Object.assign(pageviewRow.meta, p);
    send(pageviewRow, keepalive);
  }

  // لو المستخدم مسجّل، منبعت بتوكنه حتى ينكتب user_id (سياسة الجدول بتقبله بس لو = auth.uid()).
  // بلا كاش: بصفحة الدخول الجلسة بتتغيّر بعد التحميل، وحدث login لازم يمشي بالتوكن الجديد.
  function getSession() {
    return new Promise(function (resolve) {
      try {
        if (window.sb && sb.auth && sb.auth.getSession) {
          sb.auth.getSession().then(function (r) { resolve((r && r.data && r.data.session) || null); }, function () { resolve(null); });
        } else resolve(null);
      } catch (e) { resolve(null); }
    });
  }

  function send(row, keepalive) {
    var full = Object.assign({}, base, row);
    return getSession().then(function (session) {
      if (session && session.user) full.user_id = session.user.id;
      if (isDev) { console.log('[site-stats]', full); return; }
      var body = JSON.stringify(full);
      var bearer = session && session.access_token ? session.access_token : ANON_KEY;
      try {
        return fetch(ENDPOINT, {
          method: 'POST', keepalive: !!keepalive,
          headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: body,
        }).catch(function () {
          // fetch مع keepalive ممكن يفشل عند الإغلاق بمتصفّحات قديمة — sendBeacon ما بيقبل هيدرات، فالمفتاح بالرابط
          if (keepalive && navigator.sendBeacon) navigator.sendBeacon(ENDPOINT + '?apikey=' + ANON_KEY, new Blob([body], { type: 'application/json' }));
        });
      } catch (e) {}
    });
  }

  // مدة البقاء = الوقت اللي كانت فيه الصفحة ظاهرة فعلاً (مو تبويب مفتوح بالخلفية)
  var visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
  var visibleTotal = 0;
  var leaveSent = false;
  function flushVisible() {
    if (visibleSince) { visibleTotal += Date.now() - visibleSince; visibleSince = null; }
  }
  function sendLeave() {
    sendPageview(true);
    if (leaveSent) return;
    flushVisible();
    var secs = Math.round(visibleTotal / 1000);
    if (secs < 1) return;           // فتح وسكّر فوراً — ما بيقدّم شي
    leaveSent = true;
    send({ type: 'pageleave', view_id: viewId, duration_sec: Math.min(secs, 86400) }, true);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { sendLeave(); }
    // رجعة للتبويب بعد إخفائه: مدة جديدة لنفس المشاهدة (اللوحة بتجمع مدد نفس الجلسة)
    else { visibleSince = Date.now(); leaveSent = false; visibleTotal = 0; }
  });
  window.addEventListener('pagehide', sendLeave);

  if (document.readyState === 'complete') sendPageview(); else { window.addEventListener('load', function () { setTimeout(function () { sendPageview(); }, 0); }); setTimeout(function () { sendPageview(); }, 2500); }

  // أخطاء الزوار الحقيقية (بحد أقصى 3 لكل صفحة؛ متجاهلين ضجيج الإضافات والسكربتات الخارجية بلا تفاصيل)
  var errorsSent = 0;
  function reportError(message, source, line, col) {
    if (errorsSent >= 3) return;
    message = String(message || ''); source = String(source || '');
    if (!message || message === 'Script error.' || /extension:\/\//.test(source)) return;
    errorsSent++;
    send({ type: 'error', view_id: viewId, meta: { message: message.slice(0, 300), source: source.replace(/^https?:\/\/[^/]+/, '').slice(0, 200), line: line || null, col: col || null } }, true);
  }
  window.addEventListener('error', function (e) { reportError(e.message, e.filename, e.lineno, e.colno); });
  window.addEventListener('unhandledrejection', function (e) { var r = e.reason; reportError('Promise: ' + (r && r.message ? r.message : String(r)), location.pathname); });

  // مسار الإضافة تلقائياً بكل صفحات add-*: أول كتابة بالنموذج = form_start، والضغط على نشر = form_submit
  var addMatch = /\/add-([a-z]+)\.html$/.exec(path);
  if (addMatch) {
    var kind = addMatch[1] === 'ad' ? 'ad' : addMatch[1];
    var started = false;
    document.addEventListener('input', function (e) {
      if (started || !e.target || !e.target.closest || !e.target.closest('form')) return;
      started = true; step('form_start', { kind: kind });
    }, true);
    document.addEventListener('submit', function (e) {
      if (e.target && e.target.tagName === 'FORM') step('form_submit', { kind: kind });
    }, true);
  }

  function step(name, meta) {
    var m = { name: String(name).slice(0, 40) };
    try { Object.assign(m, JSON.parse(JSON.stringify(meta || {}))); } catch (e) {}
    send({ type: 'step', view_id: viewId, meta: m }, true);
  }

  window.SiteStats = {
    sessionId: sessionId,
    // type: login | signup | post — meta: تفاصيل صغيرة (method, section, kind...)
    event: function (type, meta) {
      if (['login', 'signup', 'post'].indexOf(type) === -1) return;
      var m = {};
      try { m = JSON.parse(JSON.stringify(meta || {})); } catch (e) {}
      send({ type: type, view_id: viewId, meta: m }, true);   // keepalive: الصفحة غالباً بتنتقل فوراً بعد الحدث
    },
    // خطوة بمسار الزائر: contact (اتصال/واتساب/اتجاهات)، form_start، form_submit…
    step: step,
  };
})();
