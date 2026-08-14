// ===== شروط النشر واستخدام المحتوى - مصدر واحد مشترك =====
// الشروط مهمة قانونياً: المنصة رح تضيف شعار «ملعبك» على المحتوى وتنشره على الإنترنت،
// فلازم موافقة صاحب المحتوى تكون صريحة ومربوطة بالإرسال. الشروط موحّدة بمكان واحد عشان
// تضل متطابقة بكل الفورمات (فيديو المواهب، صور الملاعب، ولاحقاً المدربين/الأكاديميات).
//
// الاستخدام بالفورم:
//   1) حمّل terms.js بعد site-core.js
//   2) احقن MalaabakTerms.block() مكان مربّع الشروط
//   3) نادِ MalaabakTerms.init() مرة وحدة (ينشئ المودال ويربط روابط «اقرأ الشروط كاملة»)
//   4) امنع الإرسال إذا #agreeTerms مش مفعّل
const MalaabakTerms = {
  // النص الكامل - يظهر بالمودال. أي تعديل قانوني بيصير هون فقط وبينعكس بكل الصفحات.
  fullHTML() {
    return `
      <h3>شروط النشر واستخدام المحتوى</h3>
      <p class="terms-intro">
        برفعك أي محتوى (فيديو أو صورة) إلى منصة «ملعبك» — سواء كان لموهبة أو مدرب أو أكاديمية أو ملعب —
        فأنت توافق صراحةً على الشروط التالية:
      </p>
      <ol class="terms-list">
        <li>
          <strong>الملكية والحقوق:</strong>
          أنت المالك الشرعي للمحتوى أو تملك كامل الحقوق والتراخيص اللازمة لنشره،
          ولا يوجد أي مانع قانوني يمنع نشره.
        </li>
        <li>
          <strong>ترخيص الاستخدام والنشر:</strong>
          تمنح «ملعبك» الحق في استخدام المحتوى وعرضه ونشره على المنصة وعلى الإنترنت ومنصات التواصل،
          وإضافة شعار / علامة «ملعبك» المائية عليه، وإجراء تعديلات تقنية عليه
          (قص، ضغط، حذف الصوت) لأغراض العرض والنشر.
        </li>
        <li>
          <strong>حقوق الغير وموافقة الأشخاص:</strong>
          المحتوى لا ينتهك حقوق أي طرف آخر (ملكية فكرية، علامات تجارية، خصوصية)،
          وقد حصلت على موافقة كل شخص يظهر فيه — أو موافقة وليّه إن كان قاصراً — على الظهور والنشر.
        </li>
        <li>
          <strong>خلوّ من الموسيقى المحمية:</strong>
          الفيديو خالٍ من الموسيقى والأغاني المحمية بحقوق النشر.
          ويحق للإدارة حذف الصوت أو رفض الفيديو إن خالف ذلك.
        </li>
        <li>
          <strong>المسؤولية القانونية:</strong>
          تتحمّل المسؤولية القانونية الكاملة عن المحتوى، وتوافق على حذفه فوراً
          إذا خالف هذه الشروط أو ورد بشأنه اعتراض مشروع.
        </li>
        <li>
          <strong>حق المراجعة والقرار المرن:</strong>
          تحتفظ «ملعبك» بحق مراجعة المحتوى قبل النشر واتخاذ أي قرار بشأنه:
          الموافقة عليه كما هو، أو حذف الصوت منه قبل النشر، أو حذف الفيديو كلياً، أو رفض الطلب —
          دون التزام بإبداء الأسباب.
        </li>
        <li>
          <strong>النطاق:</strong>
          تسري هذه الشروط على كل المحتوى المرفوع (فيديوهات وصور) لكل الأقسام:
          المواهب، المدربين، الأكاديميات، والملاعب.
        </li>
      </ol>
      <p class="terms-foot">آخر تحديث: 2026 — «ملعبك».</p>`;
  },

  // بلوك مضغوط يُدرَج داخل الفورم: ملخص + رابط للنص الكامل + شيك بوكس الموافقة الإلزامي.
  block() {
    return `
      <div class="terms-box">
        <p class="terms-box-title">📜 شروط النشر واستخدام المحتوى</p>
        <p class="terms-box-sub">
          رح نضيف شعار «ملعبك» على المحتوى وننشره على الإنترنت. قبل الإرسال، اقرأ ووافق:
        </p>
        <ul class="terms-box-list">
          <li>أنت مالك المحتوى أو تملك حق نشره، ولا مانع قانوني.</li>
          <li>تمنح «ملعبك» حق نشره وإضافة الشعار وإجراء تعديل تقني عليه.</li>
          <li>لا ينتهك حقوق أحد، وأخذت موافقة كل من يظهر فيه.</li>
          <li>خالٍ من الموسيقى والأغاني المحمية.</li>
        </ul>
        <a href="#" class="terms-open">اقرأ الشروط كاملة ›</a>
        <label class="terms-agree">
          <input type="checkbox" id="agreeTerms">
          <span>
            قرأت ووافقت على <strong>شروط النشر واستخدام المحتوى</strong>،
            وأقرّ بملكيتي أو حقّي بنشر المحتوى وخلوّه من الموسيقى المحمية.
          </span>
        </label>
      </div>`;
  },

  // ينشئ المودال مرة وحدة ويربط كل روابط .terms-open بفتحه. آمن للاستدعاء أكتر من مرة.
  init() {
    if (this._ready) return;
    this._ready = true;

    const modal = document.createElement("div");
    modal.id = "termsModal";
    modal.className = "terms-modal";
    modal.innerHTML = `
      <div class="terms-modal-backdrop"></div>
      <div class="terms-modal-panel" role="dialog" aria-modal="true" aria-label="شروط النشر واستخدام المحتوى">
        <button type="button" class="terms-modal-close" aria-label="إغلاق">×</button>
        <div class="terms-modal-body">${this.fullHTML()}</div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => modal.classList.remove("open");
    modal.querySelector(".terms-modal-close").addEventListener("click", close);
    modal.querySelector(".terms-modal-backdrop").addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    // ربط بالتفويض عشان يشتغل على أي رابط .terms-open موجود أو ينضاف لاحقاً
    document.addEventListener("click", (e) => {
      const opener = e.target.closest(".terms-open");
      if (!opener) return;
      e.preventDefault();
      modal.classList.add("open");
    });
  },
};
