/* حذف حساب مستخدم — من لوحة الإدارة فقط.

   ليش دالة سيرفر وما منحذف من المتصفّح؟ لأن حذف مستخدم من auth.users بيتطلب
   مفتاح service_role، وهاد المفتاح بيتخطّى كل قواعد RLS — لو وصل للمتصفّح، أي
   زائر بيقدر يمسح قاعدة البيانات كاملة. فبيضل بمتغيّرات Netlify بس، وهالدالة
   هي الوحيدة اللي بتلمسه.

   التحقق: المتصفّح بيبعت توكن جلسة المشرف. منتأكد إنه توكن صالح، وإن صاحبه
   is_admin فعلاً بجدول profiles — وهالفحص بيصير بالـservice role، فما في طريقة
   يزوّره حدا من المتصفّح.

   وضعان:
     mode: "preview"  → يعدّ شو رح ينحذف بلا ما يحذف شي (للتأكيد)
     mode: "delete"   → يحذف فعلاً ويرجّع الأعداد

   إعداد Netlify (Environment variables):
     SUPABASE_SERVICE_ROLE_KEY   من Supabase → Project Settings → API → service_role
     (SUPABASE_URL و SUPABASE_ANON_KEY اختياريين — عندهم قيمة افتراضية لأنهم عامّين) */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uijijqkbctemcfdzoxlg.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_fKElveNWpcfKrcC9GBjo4Q_48S5m2EK';
const MEDIA_BUCKET = 'sahat-media';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* كل جدول فيه بيانات مرتبطة بالمستخدم، مع اسم عمود المستخدم.
   الترتيب مقصود: الأبناء قبل الآباء، حتى لو ما كان في ON DELETE CASCADE
   بالقاعدة ما ينكسر الحذف على قيد مفتاح أجنبي. */
const USER_TABLES = [
  ['comments',           'user_id',    'تعليقات'],
  ['malaabak_bookings',  'user_id',    'حجوزات ملاعب'],
  ['malaabak_reviews',   'user_id',    'تقييمات ملاعب'],
  ['tourism_reviews',    'user_id',    'تقييمات سياحة'],
  ['ads',                'owner_id',   'إعلانات'],
  ['malaabak_venues',    'owner_id',   'ملاعب'],
  ['malaabak_coaches',   'owner_id',   'مدرّبون'],
  ['malaabak_academies', 'owner_id',   'أكاديميات'],
  ['malaabak_talents',   'owner_id',   'مواهب'],
  ['malaabak_matches',   'creator_id', 'مباريات'],
  ['malaabak_trainings', 'creator_id', 'تمارين'],
  ['malaabak_events',    'creator_id', 'فعاليات'],
  ['tourism_places',     'added_by',   'أماكن سياحية'],
];

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}

function serviceHeaders(key, extra) {
  return Object.assign({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, extra || {});
}

// ---------- التحقق من المشرف ----------

async function callerFromToken(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

async function isAdmin(userId, serviceKey) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin`, {
    headers: serviceHeaders(serviceKey),
  });
  if (!r.ok) return false;
  const rows = await r.json();
  return !!(rows[0] && rows[0].is_admin === true);
}

// ---------- العدّ والحذف بالجداول ----------

async function countRows(table, col, userId, serviceKey) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${userId}&select=id`, {
    method: 'HEAD',
    headers: serviceHeaders(serviceKey, { Prefer: 'count=exact' }),
  });
  if (!r.ok) return null;          // جدول مو موجود أو خطأ → منعرضه كـ"غير معروف" بدل ما نوقف
  const range = r.headers.get('content-range') || '';   // شكله: 0-24/25  أو  */0
  const total = range.split('/')[1];
  return total === undefined || total === '*' ? 0 : Number(total);
}

async function deleteRows(table, col, userId, serviceKey) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${userId}&select=id`, {
    method: 'DELETE',
    headers: serviceHeaders(serviceKey, { Prefer: 'return=representation' }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${table}: ${r.status} ${text.slice(0, 160)}`);
  }
  const rows = await r.json();
  return Array.isArray(rows) ? rows.length : 0;
}

/* تعليقات الآخرين على إعلانات هالمستخدم: لازم تروح قبل الإعلانات نفسها،
   وإلا لو comments.ad_id بلا cascade بينكسر حذف الإعلان. */
async function deleteCommentsOnUsersAds(userId, serviceKey) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ads?owner_id=eq.${userId}&select=id`, {
    headers: serviceHeaders(serviceKey),
  });
  if (!r.ok) return 0;
  const ids = (await r.json()).map((a) => a.id);
  if (!ids.length) return 0;
  const d = await fetch(`${SUPABASE_URL}/rest/v1/comments?ad_id=in.(${ids.join(',')})&select=id`, {
    method: 'DELETE',
    headers: serviceHeaders(serviceKey, { Prefer: 'return=representation' }),
  });
  if (!d.ok) return 0;
  const rows = await d.json();
  return Array.isArray(rows) ? rows.length : 0;
}

// ---------- الصور بالـStorage ----------
// مسارات الرفع كلها تحت {userId}/… فمنمسح المجلد كامل. الـlist بيرجّع مستوى
// واحد بس، فمننزل بالمجلدات الفرعية بأنفسنا.

async function listAllObjects(prefix, serviceKey, acc) {
  acc = acc || [];
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${MEDIA_BUCKET}`, {
    method: 'POST',
    headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!r.ok) return acc;
  const items = await r.json();
  for (const it of items) {
    const full = prefix ? `${prefix}/${it.name}` : it.name;
    // المجلد ما إله id ولا metadata — الملف إله
    if (it.id) acc.push(full);
    else await listAllObjects(full, serviceKey, acc);
  }
  return acc;
}

async function deleteUserStorage(userId, serviceKey) {
  const paths = await listAllObjects(userId, serviceKey);
  if (!paths.length) return 0;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}`, {
    method: 'DELETE',
    headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ prefixes: paths }),
  });
  return r.ok ? paths.length : 0;
}

// ---------- الحساب نفسه ----------

async function getProfile(userId, serviceKey) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id,name,phone,is_admin`, {
    headers: serviceHeaders(serviceKey),
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

async function deleteAuthUser(userId, serviceKey) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: serviceHeaders(serviceKey),
  });
  if (!r.ok && r.status !== 404) {
    const text = await r.text();
    throw new Error(`auth: ${r.status} ${text.slice(0, 160)}`);
  }
  return r.status !== 404;
}

// ---------- المعالج ----------

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    return json(503, { error: 'SUPABASE_SERVICE_ROLE_KEY غير مضبوط بمتغيّرات Netlify' });
  }

  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json(401, { error: 'لازم تكون مسجّل دخول' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (e) { return json(400, { error: 'JSON غير صالح' }); }

  const targetId = String(payload.user_id || '');
  const mode = payload.mode === 'delete' ? 'delete' : 'preview';
  if (!UUID_RE.test(targetId)) return json(400, { error: 'معرّف المستخدم غير صالح' });

  // 1) مين اللي عم يطلب؟ وهل هو مشرف فعلاً؟
  const caller = await callerFromToken(token);
  if (!caller) return json(401, { error: 'الجلسة منتهية — سجّل دخول من جديد' });
  if (!(await isAdmin(caller.id, SERVICE_KEY))) return json(403, { error: 'هالعملية للمشرفين فقط' });

  // 2) ما بتقدر تحذف حالك — وإلا ممكن ما يضل ولا مشرف بالموقع
  if (caller.id === targetId) return json(400, { error: 'ما بتقدر تحذف حسابك أنت من هون' });

  const profile = await getProfile(targetId, SERVICE_KEY);

  // 3) المعاينة: عدّ بس
  if (mode === 'preview') {
    const counts = {};
    for (const [table, col, label] of USER_TABLES) {
      counts[label] = await countRows(table, col, targetId, SERVICE_KEY);
    }
    const files = await listAllObjects(targetId, SERVICE_KEY);
    return json(200, { mode: 'preview', user: profile, counts, files: files.length });
  }

  // 4) الحذف الفعلي — بالترتيب، وأي فشل بيوقف ويرجّع وين وقف
  const deleted = {};
  try {
    deleted['تعليقات على إعلاناته'] = await deleteCommentsOnUsersAds(targetId, SERVICE_KEY);
    for (const [table, col, label] of USER_TABLES) {
      deleted[label] = await deleteRows(table, col, targetId, SERVICE_KEY);
    }
    deleted['ملفات صور'] = await deleteUserStorage(targetId, SERVICE_KEY);
    deleted['الملف الشخصي'] = await deleteRows('profiles', 'id', targetId, SERVICE_KEY);
    deleted['حساب الدخول'] = (await deleteAuthUser(targetId, SERVICE_KEY)) ? 1 : 0;
  } catch (err) {
    console.error('admin-delete-user failed:', err);
    return json(500, { error: 'فشل الحذف بمنتصفه', detail: String(err.message), deleted_so_far: deleted });
  }

  console.log(`admin-delete-user: ${caller.id} deleted ${targetId}`, deleted);
  return json(200, { mode: 'delete', user: profile, deleted });
};
