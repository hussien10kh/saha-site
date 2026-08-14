// ===== جسر البيانات: Supabase → SITE_DATA =====
// صفحات القوائم مبنية على SITE_DATA (كائن جافاسكريبت). بدل ما نعيد كتابة كل صفحة،
// نجيب البيانات من Supabase، نحوّلها لشكل SITE_DATA (camelCase + حقول مشتقّة)، ونحطّها بمكانها.
// نتيجة: كل صفحة قائمة تشتغل بنفس منطق ListPage القديم، بس البيانات صارت حقيقية.
//
// الاستخدام:
//   await DataBridge.load('venues');  // يعبّي SITE_DATA.venues من Supabase (approved فقط)
//
// ملاحظة: RLS + onlyApproved:true يضمنان إن المستخدم يشوف بس المعتمَد (بالإضافة لما أنشأه هو).

const DataBridge = (() => {
  const cache = {};

  // إيموجي fallback لو الصورة/العنصر مالو صورة
  const SPORT_EMOJI = {
    "كرة قدم": "⚽", "كرة صالات": "🥅", "كرة سلة": "🏀", "تنس": "🎾", "كرة طائرة": "🏐",
    "سباحة": "🏊", "لياقة بدنية": "💪", "حراس مرمى": "🧤", "يوغا": "🧘", "كروس فت": "🏋️", "تأهيل إصابات": "🩺",
  };
  const TYPE_EMOJI = { "بطولة": "🏆", "دوري": "🥇", "يوم رياضي": "🎉", "مهرجان رياضي": "🎪", "مباراة استعراضية": "⭐" };

  function pickImage(row, sportKey) {
    // للجداول اللي عندها images[] → أول صورة؛ للجداول اللي عندها image (string) → يستعمل مباشرة؛
    // fallback: إيموجي حسب الرياضة/النوع.
    if (row.images && row.images.length) return row.images[0];
    if (row.image) return row.image;
    return SPORT_EMOJI[row.sport] || SPORT_EMOJI[row.specialty] || TYPE_EMOJI[row.type] || "🏟️";
  }

  // -------- المُحوّلات (Row من Supabase → شكل SITE_DATA المتوقّع) --------
  const MAPPERS = {
    venues: (r) => ({
      ...r,
      image: pickImage(r),
      rating: Number(r.rating_avg) || 0,
      reviews: r.review_count || 0,
      amenities: r.amenities || [],
      time: [],           // مو موجود بالـDB بعد (فلترة الوقت ما رح تفعل مع الجديد)
      days: [],
      available: true,
      fieldCount: r.field_count || 1,
      payMode: r.pay_mode,
      pricing: { day: r.price, night: r.price, weekend: r.price },
      services: [],
      reviewList: [],
    }),
    coaches: (r) => ({
      ...r,
      image: pickImage(r),
      rating: Number(r.rating_avg) || 0,
      reviews: r.review_count || 0,
      pricePerSession: r.price_per_session,
      reviewList: [],
    }),
    academies: (r) => ({
      ...r,
      image: pickImage(r),
      rating: Number(r.rating_avg) || 0,
      reviews: r.review_count || 0,
      sports: r.sports || [],
      ageGroups: r.age_groups || [],
      monthlyFee: r.monthly_fee,
      reviewList: [],
    }),
    talents: (r) => ({
      ...r,
      image: pickImage(r),
      videos: r.videos || [],
    }),
    matches: (r) => ({
      ...r,
      image: pickImage(r),
      venueName: r.venue_name,
      dateLabel: r.date_label,
      ageGroup: r.age_group,
      maxParticipants: r.max_participants,
    }),
    trainings: (r) => ({
      ...r,
      image: pickImage(r),
      venueName: r.venue_name,
      dateLabel: r.date_label,
      maxParticipants: r.max_participants,
    }),
    events: (r) => ({
      ...r,
      image: pickImage(r),
      venueName: r.venue_name,
      dateLabel: r.date_label,
      maxTeams: r.max_teams,
    }),
  };

  async function load(type, opts = {}) {
    if (cache[type] && !opts.force) return cache[type];
    try {
      const rows = await MalaabakAPI.list(type, { onlyApproved: true });
      const mapper = MAPPERS[type] || ((r) => r);
      const mapped = rows.map(mapper);
      // استبدل SITE_DATA بالبيانات الحقيقية (بلا دمج مع الوهمي)
      if (typeof SITE_DATA !== "undefined") SITE_DATA[type] = mapped;
      cache[type] = mapped;
      return mapped;
    } catch (err) {
      console.error(`DataBridge.load(${type}) failed:`, err);
      // fallback: خلي SITE_DATA فاضي بدل ما تنكسر الصفحة
      if (typeof SITE_DATA !== "undefined" && !SITE_DATA[type]) SITE_DATA[type] = [];
      return SITE_DATA?.[type] || [];
    }
  }

  // تحميل عنصر واحد (لصفحات التفاصيل)
  async function loadOne(type, id) {
    const row = await MalaabakAPI.getById(type, id);
    const mapper = MAPPERS[type] || ((r) => r);
    return mapper(row);
  }

  return { load, loadOne };
})();
