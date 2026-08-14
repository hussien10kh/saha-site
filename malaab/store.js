// ===== مخزن الطلبات المُرسَلة من الفورمات (ملاعب / مباريات / مواهب) =====
// المعاينة ثابتة بلا باكند، فبدل ما الفورمات تعرض رسالة وبس، منحفظ الطلب بـlocalStorage
// ومندمجه بـSITE_DATA وقت التحميل - هيك الملعب/المباراة/الموهبة الجديدة بتنعرض فعلياً بالموقع.
//
// لازم ينحمّل بعد data.js (بيعدّل على SITE_DATA مباشرة عند التحميل).
//
// الدلالات (نفس وعود كل فورم):
//  - المباريات: تنعرض فوراً (ما في بوابة موافقة) → status غير مطلوب.
//  - الملاعب/المواهب: status:"pending" → تظهر بلوحة التحكم للمراجعة، ومخفية عن القوائم العامة
//    (venues.html يفلتر approved، talents.html أصلاً يفلتر approved) لحد ما توافق الإدارة.
const MalaabakStore = {
  KEY: "malaabak_submissions",

  _load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch (e) { return {}; }
  },
  _save(d) { localStorage.setItem(this.KEY, JSON.stringify(d)); },

  // بيرجّع كل الطلبات المخزّنة لنوع معيّن (مصفوفة)
  get(type) { return this._load()[type] || []; },

  // بيضيف طلب جديد. id كبير (Date.now) عشان ما يصادم id البيانات الأصلية (أرقام صغيرة 1..N)
  // وعشان يضل ثابت بين التحديثات (قرارات لوحة التحكم مربوطة بـtype:id).
  add(type, obj) {
    const d = this._load();
    const item = { ...obj, id: obj.id || Date.now(), _submitted: true };
    (d[type] = d[type] || []).push(item);
    this._save(d);
    return item;
  },

  // بيدمج الطلبات المخزّنة داخل مصفوفات SITE_DATA (بيحافظ على id المخزّن كما هو)
  applyTo(data) {
    if (!data) return;
    const d = this._load();
    Object.keys(d).forEach((type) => {
      if (!Array.isArray(data[type]) || !Array.isArray(d[type])) return;
      d[type].forEach((obj) => {
        // ما نضيف نفس الطلب مرتين لو انحمّل الملف أكتر من مرة بنفس الصفحة
        if (!data[type].some((x) => x.id === obj.id)) data[type].push(obj);
      });
    });
  },

  // ---------- قرارات لوحة التحكم (موافقة/رفض) ----------
  // نفس المفتاح اللي بتكتب فيه admin.html. منطبّق القرار على status فعلياً عند كل تحميل صفحة،
  // هيك الموافقة بتخلي العنصر يظهر بالقوائم العامة والرفض بيخفيه - مو بس بادج بلوحة التحكم.
  DECISIONS_KEY: "malaabak_admin_decisions",

  loadDecisions() {
    try { return JSON.parse(localStorage.getItem(this.DECISIONS_KEY)) || {}; }
    catch (e) { return {}; }
  },

  applyDecisions(data) {
    if (!data) return;
    const dec = this.loadDecisions();
    ["venues", "coaches", "academies", "talents", "trainings", "events"].forEach((type) => {
      (data[type] || []).forEach((item) => {
        // _pendingReview = كان معلّقاً أصلاً؛ منحفظه عشان لوحة التحكم تضل تعرضه مع زر التراجع
        // حتى بعد ما نقلب status (وإلا كان بيختفي من اللوحة فور الموافقة).
        if (item.status === "pending") item._pendingReview = true;
        const d = dec[`${type}:${item.id}`];
        if (d === "approved") item.status = "approved";
        else if (d === "rejected") item.status = "rejected";
      });
    });
  },
};

// الدمج التلقائي عند التحميل - بعد data.js مباشرةً وقبل أي صفحة تقرا SITE_DATA
if (typeof SITE_DATA !== "undefined") {
  MalaabakStore.applyTo(SITE_DATA);
  MalaabakStore.applyDecisions(SITE_DATA);
}
