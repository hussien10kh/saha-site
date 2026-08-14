// ===== طبقة Supabase لملعبك =====
// تحلّ محل store.js (localStorage) عند التشغيل الفعلي تحت ساحة.
// تعتمد على `sb` من js/supabase-client.js الموجود بساحة (نفس Supabase project).
//
// الاستخدام بالفورمات:
//   const item = await MalaabakAPI.create('venues', {name, sport, ...});
// بالقوائم:
//   const list = await MalaabakAPI.list('venues', {onlyApproved:true, filter:{governorate:'دمشق'}});
// بلوحة التحكم:
//   await MalaabakAPI.setStatus('venues', id, 'approved');
//
// أسماء الجداول: نضيف بادئة `malaabak_` تلقائياً (matches → malaabak_matches).
// creator/owner: matches/trainings/events تستخدم `creator_id`، الباقي `owner_id`.

const MalaabakAPI = (() => {
  const TABLE = (type) => `malaabak_${type}`;
  const OWNER_COL = (type) => ['matches','trainings','events'].includes(type) ? 'creator_id' : 'owner_id';
  const NEEDS_REVIEW = ['venues','coaches','academies','talents'];

  async function currentUserId() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('يجب تسجيل الدخول أولاً.');
    return user.id;
  }

  // -------- إنشاء --------
  // record: كائن بحقول الجدول (بلا owner_id/creator_id/status — نضيفهم نحن)
  async function create(type, record) {
    const uid = await currentUserId();
    const row = { ...record, [OWNER_COL(type)]: uid };
    // matches/trainings/events تُنشر فوراً (لها default 'approved' بـSQL) — لا نتدخّل بـstatus
    // venues/coaches/academies/talents يبقى 'pending' (default بـSQL) إلا لو التطبيق حدّده
    const { data, error } = await sb.from(TABLE(type)).insert(row).select().single();
    if (error) throw error;
    return data;
  }

  // -------- قائمة --------
  // opts: { onlyApproved:true, filter:{col:val}, order:'created_at.desc', limit:50 }
  async function list(type, opts = {}) {
    let q = sb.from(TABLE(type)).select('*');
    if (opts.onlyApproved) q = q.eq('status', 'approved');
    if (opts.filter) {
      for (const [col, val] of Object.entries(opts.filter)) {
        if (Array.isArray(val)) q = q.in(col, val); else q = q.eq(col, val);
      }
    }
    if (opts.order) {
      const [col, dir] = opts.order.split('.');
      q = q.order(col, { ascending: dir !== 'desc' });
    } else {
      q = q.order('created_at', { ascending: false });
    }
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  // -------- عنصر واحد --------
  async function getById(type, id) {
    const { data, error } = await sb.from(TABLE(type)).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  // -------- تحديث --------
  async function update(type, id, patch) {
    const { data, error } = await sb.from(TABLE(type)).update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  // -------- حذف --------
  async function remove(type, id) {
    const { error } = await sb.from(TABLE(type)).delete().eq('id', id);
    if (error) throw error;
  }

  // -------- قرار لوحة التحكم (الإدارة فقط - RLS بيحمي) --------
  async function setStatus(type, id, status) {
    if (!NEEDS_REVIEW.includes(type)) throw new Error(`النوع ${type} لا يحتاج مراجعة.`);
    const uid = await currentUserId();
    return update(type, id, { status, reviewed_by: uid, reviewed_at: new Date().toISOString() });
  }

  // -------- الطلبات المعلّقة (لوحة التحكم) --------
  async function pending(type) {
    return list(type, { filter: { status: 'pending' }, order: 'created_at.desc' });
  }

  // -------- إعلاناتي / ملعبي (كل ما أنشأه المستخدم بغض النظر عن الحالة) --------
  async function mine(type) {
    const uid = await currentUserId();
    return list(type, { filter: { [OWNER_COL(type)]: uid }, order: 'created_at.desc' });
  }

  // -------- رفع ملف خام (فيديو أو أي شي) إلى sahat-media تحت مسار المستخدم --------
  async function upload(file, path, contentType) {
    const uid = await currentUserId();
    const key = `${uid}/malaabak/${path}`;
    const { error } = await sb.storage.from(MEDIA_BUCKET).upload(key, file, {
      upsert: true, cacheControl: '3600', contentType: contentType || file.type || undefined,
    });
    if (error) throw error;
    const { data } = sb.storage.from(MEDIA_BUCKET).getPublicUrl(key);
    return data.publicUrl;
  }

  // -------- رفع صورة مع ضغط + علامة مائية "ملعبك" (نفس منطق ساحة) --------
  // baseName مثال: 'venues/aleppo-stadium' (بلا امتداد — نضيف .webp)
  async function uploadImage(file, baseName, label) {
    if (!window.MediaProcessor) throw new Error('MediaProcessor غير محمّل — أضف <script src="../js/media-processor.js"></script>');
    const blob = await MediaProcessor.processImage(file, { label: label || 'ملعبك', output: 'blob' });
    return upload(blob, `${baseName}.webp`, 'image/webp');
  }

  // slug عربي/إنجليزي آمن لاسم ملف (شبيه بـساحة)
  function slugify(txt) {
    const base = (txt || 'file').toString().normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
    return base || 'file';
  }

  // -------- الحجوزات / الانضمام --------
  async function book(targetType, targetId, note) {
    const uid = await currentUserId();
    const { data, error } = await sb.from('malaabak_bookings').insert({
      user_id: uid, target_type: targetType, target_id: targetId, note: note || null,
    }).select().single();
    if (error) throw error;
    return data;
  }
  async function cancelBooking(bookingId) {
    return sb.from('malaabak_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  }

  // -------- التقييمات --------
  async function addReview(targetType, targetId, { name, rating, text }) {
    const uid = await currentUserId();
    const { data, error } = await sb.from('malaabak_reviews').insert({
      target_type: targetType, target_id: targetId, user_id: uid, name, rating, text,
    }).select().single();
    if (error) throw error;
    return data;
  }
  async function reviews(targetType, targetId) {
    const { data, error } = await sb.from('malaabak_reviews').select('*')
      .eq('target_type', targetType).eq('target_id', targetId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  return {
    create, list, getById, update, remove, setStatus, pending, mine,
    upload, uploadImage, slugify, book, cancelBooking, addReview, reviews,
  };
})();
