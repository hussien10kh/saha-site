// مصدر بيانات مشترك للمعاينة الثابتة - نفس البيانات المعروضة يدوياً بصفحات venues.html / matches.html
// هذا يخلي أرقام .stats-bar بالصفحة الرئيسية "حقيقية" بمعنى إنها محسوبة من محتوى الموقع نفسه
// وليست أرقام عشوائية، بدل ما نحتاج باك إند فعلي (الموجود أصلاً بمجلد malaabak/backend للنسخة الشغالة الكاملة)
const SITE_DATA = {
  // مصفوفات فاضية — البيانات الحقيقية تُجلب من Supabase عبر data-bridge.js (DataBridge.load)
  // نتركها موجودة عشان صفحات تعتمد على SITE_DATA[type] كوعاء تعمل قبل ما ينتهي الجلب.
  venues: [], matches: [], coaches: [], trainings: [], academies: [], talents: [], events: [],
};

// ===== أدوات البحث النصي الحر - مشتركة بين كل صفحات الموقع =====
// معرّفة هون (مو مكررة بكل صفحة) لأنه data.js أصلاً محمّل بالـ<head> بكل صفحة فيها صندوق بحث،
// وهيك البحث بيتصرف نفس التصرف بالضبط بالرئيسية/الملاعب/المباريات بدون تكرار كود وبدون ملف جديد.
const MalaabakSearch = {
  // تطبيع النص العربي - بدونها البحث بيفشل على الكتابة الطبيعية:
  // "احمد" ما بتلاقي "أحمد"، و"مساءا" ما بتلاقي "مساءً"، و"8" ما بتلاقي "8"
  normalize(str) {
    return String(str == null ? "" : str)
      .replace(/[ً-ْٰ]/g, "") // تشكيل
      .replace(/ـ/g, "")                // تطويل (ـ)
      .replace(/[أإآٱ]/g, "ا")
      .replace(/[ىئ]/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)) // أرقام عربية-هندية → لاتينية
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  },

  // بتقبل نصوص وأرقام ومصفوفات مع بعض، وبترجّع سطر واحد مطبَّع للبحث فيه
  haystack(parts) {
    return parts.flat().filter((p) => p !== null && p !== undefined && p !== "")
      .map((p) => this.normalize(p)).join(" ");
  },

  // بحث بكل الكلمات (AND) مو كلمة وحدة - عشان "دمشق كرة قدم" تشتغل صح
  matches(haystack, term) {
    const t = this.normalize(term);
    if (!t) return true;
    return t.split(" ").every((word) => haystack.includes(word));
  },

  venueHaystack(v) {
    return this.haystack([
      v.name, v.sport, v.city, v.governorate,
      v.amenities, v.time, v.days,
      v.price, v.rating,
      v.available ? "متاح" : "غير متاح",
    ]);
  },

  matchHaystack(m) {
    return this.haystack([
      m.title, m.sport, m.venueName, m.city, m.governorate,
      m.day, m.time, m.level, m.ageGroup, m.fee,
    ]);
  },

  coachHaystack(c) {
    return this.haystack([
      c.name, c.specialty, c.city, c.governorate, c.gender,
      c.rating, c.reviews, c.pricePerSession,
      `خبرة ${c.experience} سنوات`, c.experience,
    ]);
  },

  trainingHaystack(t) {
    return this.haystack([
      t.title, t.type, t.venueName, t.city, t.governorate,
      t.day, t.dateLabel, t.time, t.period, t.coach, t.fee,
    ]);
  },

  academyHaystack(a) {
    return this.haystack([
      a.name, a.sports, a.city, a.governorate,
      a.ageGroups, a.monthlyFee, a.rating, a.reviews,
    ]);
  },

  talentHaystack(t) {
    return this.haystack([
      t.name, t.sport, t.position, t.city, t.governorate,
      t.foot, t.age, `${t.age} سنة`,
      t.videos.map((v) => v.title),
    ]);
  },

  eventHaystack(e) {
    return this.haystack([
      e.title, e.type, e.venueName, e.city, e.governorate,
      e.day, e.dateLabel, e.time, e.fee, e.fee === 0 ? "مجاني" : "",
    ]);
  },
};

// نصوص حالة "لا نتائج" - موحّدة بكل الصفحات عشان المستخدم يشوف نفس الرسالة بنفس الصياغة
const SEARCH_EMPTY_COPY = {
  title: "لا توجد نتيجة متطابقة",
  hintWithTerm: (t) => `ما لقينا شي يطابق «${t}» — جرّب كلمة تانية أو امسح البحث وجرّب من جديد.`,
  hintFiltersOnly: "ما في نتائج بهالفلاتر — جرّب توسّع الفلاتر أو امسحهم وجرّب من جديد.",
};
