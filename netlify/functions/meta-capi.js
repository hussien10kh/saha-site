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

  /* بلا إعدادات منرجع 204 بهدوء بدل خطأ: الموقع لازم يضل شغّال حتى لو التتبّع
     مو مضبوط، وما بدنا console الزائر يمتلي أخطاء. */
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn('meta-capi: META_PIXEL_ID / META_CAPI_ACCESS_TOKEN not set — dropping event');
    return { statusCode: 204, body: '' };
  }

  const raw = event.body || '';
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return { statusCode: 413, body: '' };
  }

  let payload;
  try { payload = JSON.parse(raw); }
  catch (e) { return { statusCode: 400, body: '' }; }

  if (!payload || !ALLOWED_EVENTS.has(payload.event_name)) {
    return { statusCode: 400, body: '' };
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
  if (incoming.email) user_data.em = [sha256(incoming.email)];
  if (incoming.phone) user_data.ph = [sha256(normalizePhone(incoming.phone))];
  if (incoming.external_id) user_data.external_id = [sha256(incoming.external_id)];
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

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // منطبع نص Meta كامل — رسايله بتقول بالضبط أي حقل غلط
      console.error('meta-capi: Meta rejected event', res.status, await res.text());
    }
  } catch (err) {
    console.error('meta-capi: request failed', err);
  }

  /* دايماً 204: الصفحة ما بتعمل شي بالردّ، وما بدنا فشل تتبّع يظهر للزائر. */
  return { statusCode: 204, body: '' };
};
