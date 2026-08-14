// ===== FormUX =====
// نمط موحّد لكل الفورمات (ملعبك + سياحة + إعلانات لاحقاً):
//   - رسائل خطأ عربية موحّدة
//   - إشارة خطأ بجانب الحقل (بورد أحمر + focus + scroll + toast)
//   - حالة loading على زر الإرسال (مع استرجاع النص الأصلي)
//   - Auth guard على load مع حفظ Draft بـsessionStorage و redirect back
//
// الاستخدام:
//   FormUX.requireAuth({ redirectTo: 'login.html' });   // على load
//   FormUX.clearFieldErrors();
//   if (!name) return FormUX.markFieldError(nameEl, 'الرجاء كتابة الاسم');
//   FormUX.setSubmitLoading(btn, true, 'جاري الرفع...');
//   ...
//   catch(err) { FormUX.toast(FormUX.friendlyError(err), 'error'); }
//   finally { FormUX.setSubmitLoading(btn, false); }

const FormUX = (() => {
  // ---------- Toast ----------
  function ensureToastEl() {
    let el = document.querySelector('.fux-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'fux-toast';
      document.body.appendChild(el);
    }
    return el;
  }
  function toast(msg, type = 'info', duration) {
    const el = ensureToastEl();
    el.classList.toggle('fux-toast-error', type === 'error');
    el.classList.toggle('fux-toast-success', type === 'success');
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration || (type === 'error' ? 4500 : 2800));
  }

  // ---------- Field errors ----------
  function _errorMsgElFor(el) {
    // نضيف <div class="fux-field-error"> مباشرة بعد الحقل (أو الـwrapper إذا موجود مثل .fux-pw-wrap)
    let host = el;
    if (el.parentElement && el.parentElement.classList.contains('fux-pw-wrap')) host = el.parentElement;
    let msgEl = host.nextElementSibling;
    if (!msgEl || !msgEl.classList || !msgEl.classList.contains('fux-field-error')) {
      msgEl = document.createElement('div');
      msgEl.className = 'fux-field-error';
      host.insertAdjacentElement('afterend', msgEl);
    }
    return msgEl;
  }
  function clearFieldErrors(scope) {
    (scope || document).querySelectorAll('.field-invalid').forEach((el) => el.classList.remove('field-invalid'));
    (scope || document).querySelectorAll('.fux-field-error').forEach((el) => { el.textContent = ''; el.classList.remove('show'); });
  }
  function _clearOne(el) {
    el.classList.remove('field-invalid');
    const msg = _errorMsgElFor(el);
    msg.textContent = ''; msg.classList.remove('show');
  }
  function markFieldError(el, message) {
    if (!el) { toast(message, 'error'); return; }
    el.classList.add('field-invalid');
    // رسالة خطأ تحت الحقل مباشرة
    if (message) {
      const msgEl = _errorMsgElFor(el);
      msgEl.textContent = message;
      msgEl.classList.add('show');
    }
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    try { el.focus({ preventScroll: true }); } catch (e) {}
    // اسمع أول تغيير — البورد الأحمر والرسالة يختفوا فور ما يبلّش يكتب
    const clear = () => { _clearOne(el); el.removeEventListener('input', clear); el.removeEventListener('change', clear); };
    el.addEventListener('input', clear);
    el.addEventListener('change', clear);
  }

  // ---------- Live validation on blur ----------
  // اربطها بحقول محدّدة مشان لما المستخدم يخرج من الحقل بقيمة مو منطقية، يشوف الخطأ فوراً
  // (بدل ما يستنى الضغط على "إرسال"). يستعمل validatorFn(value) → true إذا صحيح.
  function attachLiveValidator(el, validatorFn, errorMessage) {
    if (!el) return;
    el.addEventListener('blur', () => {
      const v = el.value || '';
      if (v.trim() === '') return; // فاضي = ما نظهر خطأ، الـsubmit بيعالج المطلوب
      if (!validatorFn(v)) {
        el.classList.add('field-invalid');
        const msg = _errorMsgElFor(el);
        msg.textContent = errorMessage;
        msg.classList.add('show');
      } else {
        _clearOne(el);
      }
    });
    // شيل الخطأ عند التصحيح (input)
    el.addEventListener('input', () => {
      const v = el.value || '';
      if (v.trim() === '' || validatorFn(v)) _clearOne(el);
    });
  }

  // ---------- Submit loading ----------
  function setSubmitLoading(btn, loading, loadingText) {
    if (!btn) return;
    if (loading) {
      if (!btn.dataset.origText) btn.dataset.origText = btn.textContent;
      btn.textContent = loadingText || 'جاري الحفظ...';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.origText || btn.textContent;
      btn.disabled = false;
    }
  }

  // ---------- Friendly Arabic errors ----------
  const ERROR_MAP = [
    [/Email not confirmed|email.*not.*confirm/i, 'الإيميل مو مفعّل بعد. افتح بريدك واضغط رابط التفعيل، أو اطلب إعادة إرسال.'],
    [/Invalid login credentials|invalid.*credentials/i, 'الإيميل أو كلمة السر مو صحيحة.'],
    [/User already registered|already.*registered/i, 'هالإيميل مسجّل من قبل. جرّب تسجيل الدخول.'],
    [/Password should be at least/i, 'كلمة السر قصيرة. لازم 6 أحرف على الأقل.'],
    [/duplicate key|already exists|23505/i, 'هالسجل موجود من قبل.'],
    [/permission denied|new row violates row-level|RLS/i, 'ما عندك صلاحية لهالعملية. حاول تسجّل دخول من جديد.'],
    [/Failed to fetch|network|NetworkError|ERR_INTERNET/i, 'مافي اتصال بالإنترنت. تأكد من الشبكة وحاول مجدداً.'],
    [/rate.?limit|too many requests|429/i, 'عدد محاولات كتير. استنى شوي وحاول تاني.'],
    [/timeout|timed out/i, 'انتهت مهلة الاتصال. حاول مجدداً.'],
    [/JWT expired|invalid.*token/i, 'انتهت جلستك. سجّل دخول من جديد.'],
    [/quota|payload too large|size/i, 'الملف كبير كتير. جرّب صورة أصغر.'],
  ];
  function friendlyError(err) {
    if (!err) return 'حصل خطأ غير معروف.';
    const msg = typeof err === 'string' ? err : (err.message || err.error_description || err.error || String(err));
    for (const [re, arabic] of ERROR_MAP) if (re.test(msg)) return arabic;
    return 'تعذّر إتمام العملية. ' + msg;
  }

  // ---------- Auth guard + Draft ----------
  function collectFormState(root) {
    const draft = {};
    (root || document).querySelectorAll('input, textarea, select').forEach((el) => {
      if (!el.id || el.type === 'file' || el.type === 'password') return;
      if (el.type === 'checkbox' || el.type === 'radio') { draft[el.id] = el.checked; }
      else { draft[el.id] = el.value; }
    });
    return draft;
  }
  function applyFormState(draft, root) {
    if (!draft) return;
    Object.entries(draft).forEach(([id, val]) => {
      const el = (root || document).getElementById ? (root || document).getElementById(id) : document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!val;
      else el.value = val;
    });
  }
  function draftKey() { return 'fux:draft:' + location.pathname.split('/').pop(); }
  function saveDraft(root) {
    try { sessionStorage.setItem(draftKey(), JSON.stringify({ data: collectFormState(root), ts: Date.now() })); }
    catch (e) {}
  }
  function loadDraft() {
    try {
      const raw = sessionStorage.getItem(draftKey());
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      // نصلاحية 30 دقيقة (مدّة كافية لتسجيل الدخول والعودة)
      if (Date.now() - ts > 30 * 60 * 1000) { sessionStorage.removeItem(draftKey()); return null; }
      return data;
    } catch (e) { return null; }
  }
  function clearDraft() { try { sessionStorage.removeItem(draftKey()); } catch (e) {} }

  // بيرجع Promise<user|null> — ما بيحوّل، فقط بيقول لك في مستخدم أو لأ.
  async function currentUser() {
    if (typeof sb === 'undefined') return null;
    try { const { data } = await sb.auth.getUser(); return data?.user || null; }
    catch (e) { return null; }
  }

  // يستعمل على load: لو ما في مستخدم، بينبّه المستخدم إنه لازم يسجّل دخول
  // (بشريط أعلى الصفحة) بدل ما يحوّله فوراً — بس يقفل زر الإرسال.
  // عند الضغط على "سجّل الدخول": يحفظ Draft ويحوّل مع ?redirect=.
  async function requireAuth({ loginUrl = 'login.html', submitBtnId = 'submitBtn', message } = {}) {
    const user = await currentUser();
    if (user) {
      // لو رجعنا من تسجيل دخول: استرجع Draft
      const draft = loadDraft();
      if (draft) { applyFormState(draft); clearDraft(); toast('استرجعنا اللي كتبته قبل تسجيل الدخول ✓', 'success'); }
      return user;
    }
    // مافي مستخدم → أظهر شريط + عطّل زر الإرسال
    const btn = submitBtnId ? document.getElementById(submitBtnId) : null;
    if (btn) { btn.disabled = true; btn.dataset.authGate = '1'; }
    const bar = document.createElement('div');
    bar.className = 'fux-auth-bar';
    bar.innerHTML = `
      <span>${message || 'لازم تسجّل دخول قبل النشر — سنحفظ لك اللي كتبت.'}</span>
      <button type="button" class="fux-auth-btn">تسجيل الدخول</button>`;
    document.body.appendChild(bar);
    bar.querySelector('.fux-auth-btn').addEventListener('click', () => {
      saveDraft();
      // نحتفظ بالمسار الكامل ليعود المستخدم لنفس الصفحة (مو للـroot)
      const back = location.pathname + location.search;
      location.href = loginUrl + '?redirect=' + encodeURIComponent(back);
    });
    return null;
  }

  // ---------- YouTube URL check (اختصار) ----------
  function isValidYouTubeUrl(url) {
    if (!url) return false;
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/.test(String(url));
  }

  // ---------- File size check (MB) ----------
  function checkFileSize(file, maxMB = 5) {
    if (!file) return true;
    const mb = file.size / (1024 * 1024);
    if (mb > maxMB) { toast(`الملف كبير (${mb.toFixed(1)}MB). الحد الأقصى ${maxMB}MB.`, 'error'); return false; }
    return true;
  }

  // ---------- محافظات سوريا (14) ----------
  const SYRIA_GOVERNORATES = [
    'دمشق', 'ريف دمشق', 'حلب', 'حمص', 'حماة',
    'اللاذقية', 'طرطوس', 'إدلب', 'دير الزور',
    'الرقة', 'الحسكة', 'السويداء', 'درعا', 'القنيطرة',
  ];

  // يبني <option>s جاهزة لحقن بـ<select> — بيضيف "اختر المحافظة" كأول option
  function governorateOptionsHTML(selected = '') {
    return `<option value="">اختر المحافظة</option>` +
      SYRIA_GOVERNORATES.map(g => `<option value="${g}"${g === selected ? ' selected' : ''}>${g}</option>`).join('');
  }

  // ---------- فحص "نص واضح" — يرفض التكرار الفارغ (ddd, aaa) والنصوص القصيرة ----------
  // بيرجع true إذا النص مقبول (فيه على الأقل 3 حروف مختلفة، مو تكرار حرف واحد،
  // ومو أرقام/رموز فقط)
  function isMeaningfulText(v, minLen = 3) {
    if (!v || typeof v !== 'string') return false;
    const t = v.trim();
    if (t.length < minLen) return false;
    // احذف المسافات وأرقام وعلامات ترقيم شائعة، وشوف إذا ضلّ نص فعلي
    const letters = t.replace(/[\s\d\-_.،,()[\]{}!؟?]+/g, '');
    if (letters.length < minLen) return false;
    // على الأقل 3 حروف مختلفة (يرفض 'aaa', 'ddd', 'كككك')
    const unique = new Set(letters);
    if (unique.size < 3) return false;
    return true;
  }

  return {
    toast, clearFieldErrors, markFieldError, setSubmitLoading, friendlyError,
    requireAuth, saveDraft, loadDraft, clearDraft, currentUser,
    isValidYouTubeUrl, checkFileSize, attachLiveValidator,
    SYRIA_GOVERNORATES, governorateOptionsHTML, isMeaningfulText,
  };
})();
