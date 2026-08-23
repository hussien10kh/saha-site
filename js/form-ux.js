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
  function fileSizeMB(file) { return file ? file.size / (1024 * 1024) : 0; }
  function checkFileSize(file, maxMB = 5) {
    if (!file) return true;
    const mb = fileSizeMB(file);
    if (mb > maxMB) { toast(`الملف كبير (${mb.toFixed(1)}MB). الحد الأقصى ${maxMB}MB.`, 'error'); return false; }
    return true;
  }
  // بيرجع نص وصفي بالعربي مع مستوى الخطورة {ok|warn|block}
  function fileSizeInfo(file, softMB = 20, hardMB = 50) {
    const mb = fileSizeMB(file);
    const mbStr = mb < 1 ? `${(mb*1024).toFixed(0)} كيلو` : `${mb.toFixed(1)} ميغا`;
    if (mb > hardMB) return { level: 'block', mb, text: `${mbStr} — كبير جداً (فوق ${hardMB}MB)` };
    if (mb > softMB) return { level: 'warn',  mb, text: `${mbStr} — كبير، ممكن يستغرق دقائق أو يفشل` };
    return { level: 'ok', mb, text: mbStr };
  }

  // ---------- ضغط الفيديو (بست جهد) ----------
  // browser video re-encoding عبر MediaRecorder: بيسجّل الفيديو الأصلي بـbitrate أقل.
  // ملاحظات:
  //   1) بياخذ وقت real-time (فيديو دقيقة = دقيقة ضغط تقريباً)
  //   2) بعض المتصفحات ما بتدعم captureStream على video element (Safari قديم)
  //   3) الجودة رح تتأثر شوي — بس البتريت المستهدف كافي لعرض ملعبك
  //   4) لو الملف صغير أصلاً، بيرجع الأصلي
  // opts: { targetMbps = 2, softMB = 15, onProgress(percent, note) }
  async function compressVideo(file, opts = {}) {
    const targetMbps = opts.targetMbps || 2;
    const softMB = opts.softMB || 15;
    const onProgress = opts.onProgress || (() => {});
    if (!file || !file.type.startsWith('video/')) return file;
    if (fileSizeMB(file) <= softMB) return file; // صغير — ما نضغط

    // فحص الدعم
    const hasSupport = typeof MediaRecorder !== 'undefined'
      && typeof HTMLVideoElement !== 'undefined'
      && typeof HTMLVideoElement.prototype.captureStream === 'function';
    if (!hasSupport) {
      onProgress(100, 'المتصفح ما بيدعم الضغط — رح يترفع الأصلي');
      return file;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url; video.muted = true; video.playsInline = true;
    await new Promise((res, rej) => {
      video.onloadedmetadata = res;
      video.onerror = () => rej(new Error('تعذّر قراءة الفيديو'));
    });

    const durationSec = video.duration || 0;
    if (!isFinite(durationSec) || durationSec === 0) {
      URL.revokeObjectURL(url);
      return file; // مو قادرين نحسب المدة — استعمل الأصلي
    }

    // اختر أفضل mimeType متاح
    const candidates = [
      'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus', 'video/webm',
    ];
    let mimeType = '';
    for (const c of candidates) if (MediaRecorder.isTypeSupported(c)) { mimeType = c; break; }
    if (!mimeType) {
      URL.revokeObjectURL(url);
      onProgress(100, 'المتصفح ما بيدعم الضغط — رح يترفع الأصلي');
      return file;
    }

    let stream;
    try { stream = video.captureStream(30); }
    catch (e) { URL.revokeObjectURL(url); return file; }

    return new Promise((resolve) => {
      const chunks = [];
      const bitsPerSec = targetMbps * 1000 * 1000;
      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSec });
      } catch (e) { URL.revokeObjectURL(url); return resolve(file); }

      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        const blob = new Blob(chunks, { type: 'video/webm' });
        // لو النتيجة أكبر أو نفس الأصل، ارجع الأصلي (الضغط ما نفع)
        if (blob.size >= file.size * 0.95) { onProgress(100, 'الضغط ما وفّر مساحة — رح يترفع الأصلي'); return resolve(file); }
        // اعطي الـblob اسم واضح
        blob.name = (file.name.replace(/\.[^.]+$/, '') || 'video') + '.webm';
        onProgress(100, `تم الضغط: ${(blob.size/(1024*1024)).toFixed(1)}MB (كان ${(file.size/(1024*1024)).toFixed(1)}MB)`);
        resolve(blob);
      };

      // تحديث تقدّم كل 200ms على أساس currentTime/duration
      const progressTimer = setInterval(() => {
        const pct = Math.min(99, Math.round((video.currentTime / durationSec) * 100));
        onProgress(pct, `جاري ضغط الفيديو... ${pct}%`);
      }, 200);
      video.onended = () => {
        clearInterval(progressTimer);
        recorder.stop();
      };
      video.onerror = () => { clearInterval(progressTimer); URL.revokeObjectURL(url); resolve(file); };

      recorder.start(1000);
      video.play().catch(() => { clearInterval(progressTimer); recorder.stop(); URL.revokeObjectURL(url); resolve(file); });
    });
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

  // ---------- Promote .role-picker divs to accessible radio groups ----------
  // كانت <div>s فيها click handlers — مو keyboard-reachable ولا مرئية لقارئ الشاشة.
  // Auto-init: أي .role-picker بالصفحة يصير role=radiogroup مع children radio + tabindex + arrow key nav.
  function initRolePickers(scope) {
    (scope || document).querySelectorAll('.role-picker').forEach((rp) => {
      if (rp.dataset.a11yInit) return;
      rp.dataset.a11yInit = '1';
      rp.setAttribute('role', 'radiogroup');
      const opts = rp.querySelectorAll('[data-value]');
      opts.forEach((o, i) => {
        o.setAttribute('role', 'radio');
        o.setAttribute('tabindex', o.classList.contains('selected') ? '0' : '-1');
        o.setAttribute('aria-checked', o.classList.contains('selected') ? 'true' : 'false');
        // اختصار لوحة المفاتيح: أسهم يمين/يسار للتنقل، مسافة/إدخال للاختيار
        o.addEventListener('keydown', (e) => {
          const list = Array.from(rp.querySelectorAll('[data-value]'));
          const idx = list.indexOf(o);
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault(); (list[(idx+1)%list.length]).focus(); (list[(idx+1)%list.length]).click();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault(); (list[(idx-1+list.length)%list.length]).focus(); (list[(idx-1+list.length)%list.length]).click();
          } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault(); o.click();
          }
        });
      });
      // بعد أي click داخل الـpicker، حدّث aria-checked و tabindex
      rp.addEventListener('click', () => {
        rp.querySelectorAll('[data-value]').forEach((o) => {
          const sel = o.classList.contains('selected');
          o.setAttribute('aria-checked', sel ? 'true' : 'false');
          o.setAttribute('tabindex', sel ? '0' : '-1');
        });
      });
    });
  }
  // شغّلها بعد ما يتحمّل الـDOM
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initRolePickers());
    else initRolePickers();
  }

  return {
    toast, clearFieldErrors, markFieldError, setSubmitLoading, friendlyError,
    requireAuth, saveDraft, loadDraft, clearDraft, currentUser,
    isValidYouTubeUrl, checkFileSize, attachLiveValidator,
    fileSizeMB, fileSizeInfo, compressVideo,
    SYRIA_GOVERNORATES, governorateOptionsHTML, isMeaningfulText,
    initRolePickers,
  };
})();
