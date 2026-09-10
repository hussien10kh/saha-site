// ===== بانر موافقة الكوكيز — ساحة =====
// الـMeta Pixel ما بينحمّل أبداً قبل ما المستخدم يوافق صراحةً (شوف js/meta-pixel.js).
// هالملف مسؤول بس عن الواجهة: بيعرض الخيار، وبيبلّغ MetaPixel بالقرار.
//
// لازم ينحمّل بعد js/meta-pixel.js.
//
// القرار بينحفظ بـlocalStorage تحت saaha:consent:v1 — فما بينعاد السؤال كل زيارة.
// لتغيير القرار لاحقاً (مثلاً من صفحة الخصوصية):  SaahaConsent.reopen()

const SaahaConsent = (() => {
  // مسار صفحة الخصوصية بيختلف بين الجذر والمجلدات الفرعية (malaab/ و tourism/)
  const privacyHref = location.pathname.indexOf('/malaab/') !== -1
    || location.pathname.indexOf('/tourism/') !== -1
    ? '../privacy.html' : 'privacy.html';

  const CSS = `
    .saaha-consent{position:fixed;inset-inline:0;bottom:0;z-index:9998;
      display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;
      padding:14px 18px;
      background:var(--surface,#fff);color:var(--text,#182333);
      border-top:1px solid var(--border,#e6e9f0);
      box-shadow:var(--shadow-lg,0 -8px 30px rgba(20,30,60,.14));
      font-family:inherit;font-size:14px;line-height:1.7;direction:rtl;
      transform:translateY(100%);transition:transform .28s ease}
    .saaha-consent.open{transform:translateY(0)}
    .saaha-consent p{margin:0;flex:1 1 320px;max-width:640px}
    .saaha-consent a{color:var(--accent,#0412ad);text-decoration:underline}
    .saaha-consent-actions{display:flex;gap:10px;flex-shrink:0}
    .saaha-consent button{font:inherit;font-weight:600;cursor:pointer;
      padding:9px 20px;border-radius:var(--radius-pill,999px);border:1px solid transparent;
      transition:opacity .15s ease}
    .saaha-consent button:hover{opacity:.85}
    .saaha-consent .sc-accept{background:var(--primary,#15264a);color:#fff}
    .saaha-consent .sc-deny{background:transparent;color:var(--muted,#6b7686);
      border-color:var(--border,#e6e9f0)}
    @media (max-width:520px){
      .saaha-consent{flex-direction:column;align-items:stretch;text-align:center;padding:16px}
      .saaha-consent-actions{justify-content:center}
      .saaha-consent button{flex:1}
    }
    @media (prefers-reduced-motion:reduce){
      .saaha-consent{transition:none}
    }`;

  let el = null;

  function _decide(granted) {
    if (typeof MetaPixel !== 'undefined') {
      granted ? MetaPixel.grantConsent() : MetaPixel.denyConsent();
    }
    if (!el) return;
    el.classList.remove('open');
    // ننطر الحركة تخلص قبل ما نشيله من الـDOM
    setTimeout(() => { if (el && el.parentNode) el.parentNode.removeChild(el); el = null; }, 300);
  }

  function show() {
    if (el) return;

    if (!document.getElementById('saaha-consent-css')) {
      const style = document.createElement('style');
      style.id = 'saaha-consent-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    el = document.createElement('div');
    el.className = 'saaha-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'إعدادات الخصوصية');
    /* الأداتين (Analytics و Meta) صارتا خلف نفس البوابة، فالنص رجع بسيط:
       ما في شي بيشتغل قبل الموافقة. */
    el.innerHTML = `
      <p>منستخدم كوكيز لقياس الزيارات وأداء حملاتنا الإعلانية.
         ما بيشتغل ولا شي قبل موافقتك — وبتقدر ترفض وتكمّل تصفّح عادي،
         ما رح يتغيّر شي بالموقع.
         <a href="${privacyHref}">سياسة الخصوصية</a></p>
      <div class="saaha-consent-actions">
        <button type="button" class="sc-deny">رفض</button>
        <button type="button" class="sc-accept">موافق</button>
      </div>`;

    el.querySelector('.sc-accept').addEventListener('click', () => _decide(true));
    el.querySelector('.sc-deny').addEventListener('click', () => _decide(false));
    document.body.appendChild(el);

    // نضطر ننطر frame واحد عشان الـtransition تشتغل (العنصر لازم يترسم أول بمكانه المخفي)
    requestAnimationFrame(() => requestAnimationFrame(() => el && el.classList.add('open')));
  }

  // لإعادة فتح الخيار — منربطها من صفحة الخصوصية أو الفوتر
  function reopen() {
    try { localStorage.removeItem('saaha:consent:v1'); } catch (e) {}
    show();
  }

  function init() {
    // ما منعرض شي لو المستخدم أصلاً قرر (وافق أو رفض)
    const state = typeof MetaPixel !== 'undefined' ? MetaPixel.consentState() : 'unset';
    if (state === 'unset') show();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { show, reopen };
})();

window.SaahaConsent = SaahaConsent;
