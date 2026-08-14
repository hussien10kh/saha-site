// ===== النواة المشتركة لكل صفحات الموقع =====
// الهدف: نوقف تكرار نفس الكود بكل صفحة. قبل هالملف كان عنا:
//   - خريطة المحافظات + المدن: 3 نسخ متطابقة
//   - تعبئة حقول التاريخ (يوم/شهر/سنة): 3 نسخ متطابقة
//   - الهيدر والفوتر: 13 نسخة (أي تعديل بالناف بار كان بده 13 تعديل يدوي)
// لازم ينحمّل بالـ<head> قبل أي سكربت تاني بالصفحة.

const SiteCore = {
  // ---------- المحافظات والمدن ----------
  governorates: {
    "دمشق": ["المزة", "أبو رمانة", "كفرسوسة", "باب توما"],
    "ريف دمشق": ["دوما", "التل", "قدسيا", "جرمانا"],
    "حلب": ["الفرقان", "الشهباء", "الحمدانية", "السريان"],
    "حمص": ["الوعر", "الإنشاءات", "كرم الشامي"],
    "حماة": ["الحاضر", "المدينة", "الصهيونية"],
    "اللاذقية": ["الكورنيش", "الزراعة", "الصليبة"],
    "طرطوس": ["المدينة", "الرمل الشمالي"],
    "إدلب": ["المدينة", "أريحا"],
    "درعا": ["المدينة", "نوى"],
    "السويداء": ["المدينة", "شهبا"],
    "القنيطرة": ["المدينة"],
    "دير الزور": ["المدينة", "الميادين"],
    "الرقة": ["المدينة"],
    "الحسكة": ["المدينة", "القامشلي"],
  },

  CUSTOM_CITIES_KEY: "malaabak_custom_cities",

  loadCustomCities() {
    try { return JSON.parse(localStorage.getItem(this.CUSTOM_CITIES_KEY)) || {}; }
    catch (e) { return {}; }
  },

  saveCustomCity(governorate, city) {
    const custom = this.loadCustomCities();
    if (!custom[governorate]) custom[governorate] = [];
    if (!custom[governorate].includes(city)) {
      custom[governorate].push(city);
      localStorage.setItem(this.CUSTOM_CITIES_KEY, JSON.stringify(custom));
    }
  },

  citiesFor(governorate) {
    const custom = this.loadCustomCities();
    const base = this.governorates[governorate] || [];
    const extra = custom[governorate] || [];
    return [...new Set([...base, ...extra])];
  },

  // ---------- الهيدر ----------
  // روابط الناف بار بمكان واحد - أي إضافة/حذف تبويب بتنعكس على كل الصفحات تلقائياً
  navLinks: [
    { href: "index.html", key: "index", label: "الرئيسية" },
    { href: "venues.html", key: "venues", label: "الملاعب" },
    { href: "matches.html", key: "matches", label: "المباريات" },
    { href: "training.html", key: "training", label: "التمارين" },
    { href: "academies.html", key: "academies", label: "أكاديميات" },
    { href: "coaches.html", key: "coaches", label: "المدربين" },
    { href: "talents.html", key: "talents", label: "مواهب" },
    { href: "events.html", key: "events", label: "الفعاليات" },
  ],

  // active = مفتاح الصفحة الحالية | hideAddVenue = لإخفاء زر "أضف ملعب" (صفحات المباريات)
  headerHTML({ active = "", hideAddVenue = false } = {}) {
    const links = this.navLinks.map((l) =>
      `<a href="${l.href}"${l.key === active ? ' class="active"' : ""}>${l.label}</a>`
    ).join("\n    ");
    const addVenue = hideAddVenue ? "" : `<a class="btn btn-outline" href="add-venue.html">+ أضف ملعب</a>\n    `;
    // ملاحظة مهمة: header.nav لازم يضل بدون position (static) - راجع تحذير clipping بـDESIGN-SYSTEM
    return `<header class="nav">
  <div class="logo"><span class="ball"><img src="player-silhouette.svg" alt="ملعبك"></span> ملعبك</div>
  <nav class="nav-links">
    ${links}
  </nav>
  <div class="nav-actions">
    ${addVenue}<a class="btn btn-outline" href="login.html">تسجيل الدخول</a>
    <a class="btn btn-primary" href="register.html">إنشاء حساب</a>
  </div>
</header>`;
  },

  // ---------- شريط أقسام ساحة (فوق الفوتر) ----------
  // مكوّن موحّد يُعرّف بمنصات ساحة الثلاث. هون القسم الحالي = ملعبك، فالجانبان: اعلانات + سياحة.
  // الروابط # مؤقتة لحد توحيد الدومين (تصير /، /tourism لاحقاً).
  portalStripHTML() {
    return `<div class="saaha-portal"><div class="orbit"><div class="orbit-row"><a class="oside k-ads" href="../ads.html"><span class="oic"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9.5A1.5 1.5 0 0 1 5.5 8H8l6-3.6a1 1 0 0 1 1.5.86v13.5A1 1 0 0 1 14 19.6L8 16H5.5A1.5 1.5 0 0 1 4 14.5z"/><path d="M17 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><div class="otxt"><div class="onm">اعلانات</div><div class="ods">كل شيء جميل يبدأ من عنا</div></div><span class="ochev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></span></a><span class="oconn"><i class="cdot" style="background:#2540d0"></i></span><div class="ocenter"><div class="odisc">ساحة</div></div><span class="oconn"><i class="cdot" style="background:#0d9488"></i></span><a class="oside k-tour" href="../tourism/index.html"><span class="ochev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></span><div class="otxt"><div class="onm">سياحة</div><div class="ods">اكتشف كل الجمال في سوريا</div></div><span class="oic"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.1 7 13 7 13s7-7.9 7-13a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg></span></a></div></div></div>`;
  },

  // ---------- الفوتر ----------
  footerHTML() {
    return `${this.portalStripHTML()}<footer class="site-footer">
  <div class="footer-top">
    <div class="footer-brand">
      <div class="footer-brand-top">
        <div class="logo"><span class="ball"><img src="player-silhouette.svg" alt="ملعبك"></span> ملعبك</div>
        <p>منصة رياضية سورية لحجز الملاعب، الانضمام للمباريات والتمارين، والتواصل مع أفضل المدربين.</p>
      </div>
      <div class="footer-social">
        <a href="https://www.facebook.com/saahasyria" target="_blank" rel="noopener" aria-label="فيسبوك"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.5-3H13.5V8.5c0-.9.25-1.5 1.53-1.5H16.5V4.36C16.19 4.32 15.13 4.22 13.9 4.22c-2.55 0-4.3 1.56-4.3 4.42V10.5H7v3h2.6V21h3.9z"/></svg></a>
        <a href="https://www.instagram.com/saahasyria/" target="_blank" rel="noopener" aria-label="انستغرام"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="12" r="3.8"/><circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none"/></svg></a>
        <a href="https://x.com/saahasyria" target="_blank" rel="noopener" aria-label="اكس"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 3H21l-6.4 7.3L22.1 21h-6.6l-5.2-6.6L4.3 21H2.2l6.8-7.8L1.9 3h6.8l4.7 6.1L18.9 3zM17.7 19h1.8L7.9 4.9H6l11.7 14.1z"/></svg></a>
        <a href="https://www.youtube.com/@saahasyria" target="_blank" rel="noopener" aria-label="يوتيوب"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2s-.2-1.5-.8-2.2c-.8-.8-1.6-.8-2-.9C16.4 5 12 5 12 5s-4.4 0-7.2.1c-.4.1-1.2.1-2 .9C2.2 6.7 2 8.2 2 8.2S1.8 10 1.8 11.7v1.1C1.8 14.5 2 16.3 2 16.3s.2 1.5.8 2.2c.8.8 1.8.8 2.3.9 1.7.2 7 .1 7 .1s4.4 0 7.2-.1c.4 0 1.2-.1 2-.9.6-.7.8-2.2.8-2.2s.2-1.8.2-3.5v-1.1C22.2 10 22 8.2 22 8.2zM9.9 14.6V9.4l5 2.6-5 2.6z"/></svg></a>
      </div>
    </div>
    <div class="footer-links-group">
      <div class="footer-col">
        <h4>روابط سريعة</h4>
        <a href="venues.html">الملاعب</a>
        <a href="matches.html">المباريات</a>
        <a href="training.html">التمارين</a>
        <a href="academies.html">أكاديميات</a>
        <a href="coaches.html">المدربين</a>
        <a href="talents.html">مواهب</a>
      </div>
      <div class="footer-col">
        <h4>الحساب</h4>
        <a href="login.html">تسجيل الدخول</a>
        <a href="register.html">إنشاء حساب</a>
        <a href="add-venue.html">أضف ملعبك</a>
        <a href="events.html">الفعاليات</a>
      </div>
      <div class="footer-col">
        <h4>الدعم</h4>
        <a href="../contact.html">تواصل معنا</a>
        <a href="../faq.html">الأسئلة الشائعة</a>
        <a href="../terms.html">الشروط والأحكام</a>
        <a href="admin.html">لوحة التحكم</a>
      </div>
    </div>
  </div>
  <div class="saaha-copy-wrap"><div class="saaha-copy"><span class="saaha-copy-name">ساحة — 2026</span><span class="saaha-copy-slogan">كل شي جميل بيبدا من ساحة</span></div></div>
</footer>`;
  },

  // بتكتب الهيدر/الفوتر مكان عناصر النائب (placeholders) - بتنكتب فوراً وقت التحميل
  // فما بيصير وميض ولا انزياح بالتخطيط
  mountHeader(opts) {
    const el = document.getElementById("siteHeader");
    if (el) el.outerHTML = this.headerHTML(opts);
  },

  mountFooter() {
    const el = document.getElementById("siteFooter");
    if (el) el.outerHTML = this.footerHTML();
  },

  // ---------- حقول التاريخ (يوم/شهر/سنة) ----------
  // بديل input[type=date] - المتصفح ما بيحترم dir/direction لهاد النوع جوا صفحة RTL،
  // فاستبدلناه بـ3 قوائم عادية بترتيب LTR مضمون. (راجع DESIGN-SYSTEM)
  // ملاحظة: هالحقول للعرض فقط - ما في تاريخ تقويمي بالبيانات فما بتفلتر شي.
  fillDateSelects() {
    const daySelect = document.getElementById("filterDay");
    const monthSelect = document.getElementById("filterMonth");
    const yearSelect = document.getElementById("filterYear");
    if (!daySelect || !monthSelect || !yearSelect) return;

    const addPlaceholder = (sel, text) => {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = text;
      sel.appendChild(o);
    };
    const addRange = (sel, from, to) => {
      for (let i = from; i <= to; i++) {
        const o = document.createElement("option");
        o.value = i;
        o.textContent = i;
        sel.appendChild(o);
      }
    };

    addPlaceholder(daySelect, "يوم");
    addRange(daySelect, 1, 31);
    addPlaceholder(monthSelect, "شهر");
    addRange(monthSelect, 1, 12);
    addPlaceholder(yearSelect, "سنة");
    const y = new Date().getFullYear();
    addRange(yearSelect, y, y + 2);

    // كل قائمة بتتوسع لما تنفتح وبترجع لحجمها لما تنسكر (بالجافاسكربت مو :focus لحاله)
    [daySelect, monthSelect, yearSelect].forEach((sel) => {
      sel.addEventListener("focus", () => sel.classList.add("expanded"));
      sel.addEventListener("blur", () => sel.classList.remove("expanded"));
      sel.addEventListener("change", () => sel.classList.remove("expanded"));
    });
  },

  // ---------- ربط المحافظة/المدينة بصندوق البحث ----------
  // بترجّع refreshCityOptions عشان الصفحة تقدر تستدعيها بعد مسح الفلاتر
  setupGovCity() {
    const govSelect = document.getElementById("filterGovernorate");
    const cityInput = document.getElementById("filterCity");
    const cityList = document.getElementById("cityOptions");
    if (!govSelect || !cityInput || !cityList) return null;

    Object.keys(this.governorates).forEach((gov) => {
      const opt = document.createElement("option");
      opt.value = gov;
      opt.textContent = gov;
      govSelect.appendChild(opt);
    });

    const refreshCityOptions = () => {
      cityList.innerHTML = "";
      const gov = govSelect.value;
      const all = gov
        ? this.citiesFor(gov)
        : Object.keys(this.governorates).flatMap((g) => this.citiesFor(g));
      [...new Set(all)].forEach((city) => {
        const opt = document.createElement("option");
        opt.value = city;
        cityList.appendChild(opt);
      });
    };

    refreshCityOptions();
    govSelect.addEventListener("change", refreshCityOptions);
    return { govSelect, cityInput, cityList, refreshCityOptions };
  },
};
