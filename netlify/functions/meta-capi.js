/* Meta Conversions API — وسيط server-side.

   ليش أصلاً منحتاجه والـPixel شغّال؟ لأن مانعات الإعلانات و ITP على iOS بتوقف
   جزء كبير من أحداث المتصفّح. الأحداث اللي بتوصل من السيرفر ما بتتأثر فيهم،
   فالـfunnel بيصير أقرب للحقيقة (فرق 20-40% مو نادر).

   الـdeduplication: العميل بيبعت نفس الـevent_id للـPixel وللدالة هاي، وMeta
   بيدمج النسختين بحدث واحد. بلا هالـid رح ينعدّ كل تحويل مرتين.

   إعداد Netlify (Site settings → Environment variables):
     META_PIXEL_ID           رقم الـPixel (نفس اللي بـjs/meta-pixel.js)
     META_CAPI_ACCESS_TOKEN  من Events Manager → Settings → Conversions API
     META_CAPI_TEST_CODE     (اختياري) كود Test Events وقت الفحص فقط — شيله بعدين

   وبعد النشر: خلّي META_CAPI_ENABLED = true بـjs/meta-pixel.js.

   للفحص: أضف ?debug=1 على الرابط وبترجع ردّ Meta الحقيقي بدل 204 —
   بلاه ما في طريقة تعرف إذا Meta قبل الحدث، لأن 204 بترجع بالحالتين.

   ملاحظة خصوصية: الدالة ما بتخزّن شي. الإيميل/الجوال — لو انبعتوا — بينهشّوا
   بـSHA-256 قبل ما يطلعوا لMeta، وهاد اللي بيطلبه Meta أصلاً. */

const crypto = require('crypto');

const GRAPH_VERSION = 'v21.0';

/* قائمة مغلقة بالأحداث المسموحة. الدالة endpoint عام، وبلا هالفلتر بيصير
   ممكن لأي حدا يبعت أحداث عشوائية لحساب الإعلانات ويوسّخ بيانات التحسين. */
const ALLOWED_EVENTS = new Set([
  'PageView', 'ViewContent', 'Search', 'CompleteRegistration',
  'Lead', 'Contact', 'InitiateCheckout', 'AddToWishlist',
]);

const MAX_BODY_BYTES = 8 * 1024;

// Meta بيتوقّع القيم الشخصية مهشّرة SHA-256 بعد تنظيف وتصغير الحروف
function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

// هاش SHA-256 بالـhex طوله 64 خانة دايماً — فهيك منميّز المهشّر عن الخام
const SHA256_HEX = /^[0-9a-f]{64}$/i;
function alreadyHashed(value) {
  const v = String(value);
  return SHA256_HEX.test(v) ? v.toLowerCase() : sha256(v);
}

// أرقام سوريا منخزّنها بصيغ مختلفة (09xx / +9639xx) — منوحّدها قبل الهاش
// وإلا نفس المستخدم بينحسب شخصين مختلفين عند Meta.
function normalizePhone(raw) {
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '963' + d.slice(1);
  else if (!d.startsWith('963')) d = '963' + d;
  return d;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
  const TEST_CODE = process.env.META_CAPI_TEST_CODE;

  /* وضع التشخيص: ?debug=1 بيخلّي الدالة ترجّع ردّ Meta الحقيقي بدل 204.
     بلاه ما في طريقة نعرف إذا Meta قبل الحدث أو رفضه — 204 بترجع بالحالتين
     (وهاد مقصود: فشل التتبّع ما لازم يكسر الموقع لأي زائر).
     الزوّار العاديين ما بيمرّروا العلم أبداً، فسلوكهم ما بيتغيّر.
     ملاحظة: الردّ ما بيحتوي التوكن — رسائل Meta ما فيها أسرار. */
  const debug = !!(event.queryStringParameters && event.queryStringParameters.debug === '1');
  const reply = (statusCode, info) => (debug
    ? { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(info) }
    : { statusCode, body: '' });

  /* بلا إعدادات منرجع 204 بهدوء بدل خطأ: الموقع لازم يضل شغّال حتى لو التتبّع
     مو مضبوط، وما بدنا console الزائر يمتلي أخطاء. */
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn('meta-capi: META_PIXEL_ID / META_CAPI_ACCESS_TOKEN not set — dropping event');
    return reply(204, {
      ok: false,
      reason: 'env_missing',
      has_pixel_id: !!PIXEL_ID,
      has_access_token: !!ACCESS_TOKEN,
    });
  }

  const raw = event.body || '';
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return { statusCode: 413, body: '' };
  }

  let payload;
  try { payload = JSON.parse(raw); }
  catch (e) { return reply(400, { ok: false, reason: 'bad_json' }); }

  if (!payload || !ALLOWED_EVENTS.has(payload.event_name)) {
    return reply(400, {
      ok: false,
      reason: 'event_not_allowed',
      event_name: payload && payload.event_name,
      allowed: [...ALLOWED_EVENTS],
    });
  }

  const headers = event.headers || {};
  const clientIp = (headers['x-nf-client-connection-ip']
    || (headers['x-forwarded-for'] || '').split(',')[0]
    || '').trim();

  const incoming = payload.user_data || {};
  const user_data = {};
  // fbp/fbc هنّي أقوى إشارتَي مطابقة عندنا — بينوصلوا كما هم (مو PII)
  if (incoming.fbp) user_data.fbp = incoming.fbp;
  if (incoming.fbc) user_data.fbc = incoming.fbc;

  /* المتصفّح بيهشّر الهوية قبل ما يبعتها (em/ph/external_id)، فالخام ما بيوصل
     لهون أصلاً. منقبل الشكلين: قيمة مهشّرة منمرّرها كما هي، وقيمة خام منهشّرها.
     بلا هالتفريق كنّا رح نهشّر المهشّر مرتين وMeta ما بيلاقي ولا مطابقة. */
  if (incoming.em) user_data.em = [alreadyHashed(incoming.em)];
  else if (incoming.email) user_data.em = [sha256(incoming.email)];

  if (incoming.ph) user_data.ph = [alreadyHashed(incoming.ph)];
  else if (incoming.phone) user_data.ph = [sha256(normalizePhone(incoming.phone))];

  if (incoming.external_id) user_data.external_id = [alreadyHashed(incoming.external_id)];
  if (clientIp) user_data.client_ip_address = clientIp;
  if (headers['user-agent']) user_data.client_user_agent = headers['user-agent'];

  const body = {
    data: [{
      event_name: payload.event_name,
      event_time: Number(payload.event_time) || Math.floor(Date.now() / 1000),
      event_id: payload.event_id,                       // ← مفتاح الـdedup مع الـPixel
      event_source_url: payload.event_source_url,
      action_source: 'website',
      user_data,
      custom_data: payload.custom_data || {},
    }],
  };
  if (TEST_CODE) body.test_event_code = TEST_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events`
    + `?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

  let metaStatus = null;
  let metaBody = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    metaStatus = res.status;
    metaBody = await res.text();      // منقراه دايماً، مو بس عند الفشل — التشخيص بيحتاجه
    if (!res.ok) {
      // منطبع نص Meta كامل — رسايله بتقول بالضبط أي حقل غلط
      console.error('meta-capi: Meta rejected event', metaStatus, metaBody);
    }
  } catch (err) {
    console.error('meta-capi: request failed', err);
    return reply(204, { ok: false, reason: 'network_error', error: String(err && err.message) });
  }

  let parsed = null;
  try { parsed = JSON.parse(metaBody); } catch (e) {}

  /* دايماً 204 للزوّار: الصفحة ما بتعمل شي بالردّ، وما بدنا فشل تتبّع يظهر للزائر.
     مع ?debug=1 منرجّع ردّ Meta كما هو عشان نعرف إذا قبله فعلاً. */
  return reply(204, {
    ok: metaStatus === 200 && !!(parsed && parsed.events_received),
    pixel_id: PIXEL_ID,
    test_event_code: TEST_CODE || null,
    meta_status: metaStatus,
    meta_response: parsed || metaBody,
    sent_user_data_keys: Object.keys(user_data),
  });
};
