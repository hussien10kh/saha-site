# الخطوات الجاية — ربط ملعبك بالباكند

آخر تحديث: 2026-08-08 · **المخططات شغّالة على Supabase، والفورمات السبعة كلها تكتب لـSupabase.**

## ✅ منجَز
- **`malaabak-api.js`** — طبقة كاملة (create/list/getById/update/remove/pending/mine/setStatus/upload/book/reviews).
- **`supabase-init.js`** — تهيئة sb للمعاينة (مؤقت، ينفكّ بعد النقل تحت ساحة).
- **٧ فورمات مربوطة**:
  - `add-venue` — رفع صورة + INSERT (status pending)
  - `add-coach` — رفع صورة + INSERT (status pending)
  - `add-academy` — رفع صورة + INSERT (status pending)
  - `add-talent` — **رفع فيديو حقيقي** + INSERT (status pending)
  - `add-match` — INSERT فوري (status approved)
  - `add-event` — INSERT فوري (status approved)
  - `add-training` — INSERT فوري (status approved)
- كل فورم يتحقّق من تسجيل الدخول ويوجّه لـlogin إن لأ.
- كل الصفحات تحمّل بلا أخطاء كونسول، الاتصال بـSupabase مُتحقَّق منه (`count=0` من الجدول، Storage OK).

## 🚧 التالي (بالترتيب)

### 1. ✅ صفحات القوائم — مُنجَز (2026-08-08)
- **`data-bridge.js`** — يجيب من Supabase ويحوّل snake→camel + حقول مشتقّة، ويستبدل `SITE_DATA[type]`.
- كل الصفحات السبعة (venues/matches/training/events/coaches/academies/talents) صارت **async**، تنادي `await DataBridge.load(type)` قبل `ListPage.create`، وتعرض بيانات Supabase الحقيقية.
- مفحوصة: صفر أخطاء، القوائم فاضية (متوقّع — قاعدة البيانات فاضية)، "لا يوجد نتائج" يظهر صحيح.

### 2. ✅ صفحات التفاصيل — مُنجَز (2026-08-08)
كل صفحات التفاصيل السبعة (venue/coach/academy/talent/match/training/event) صارت تنتظر `DataBridge.load(type)` قبل عرض العنصر. مفحوصة: تحمّل بلا أخطاء، عرض "غير موجود" صحيح لما القاعدة فاضية.

### 3. ✅ `admin.html` جديد — مُنجَز (2026-08-08)
- فحص المصادقة (redirect لـlogin إذا لأ).
- فحص `is_admin` من profiles (رسالة رفض إذا لأ).
- تحميل `pending` من كل نوع عبر `MalaabakAPI.pending()`.
- موافقة/رفض تكتب فعلياً عبر `MalaabakAPI.setStatus()`.
- قرار الفيديو المرن (asis/muted/deleted) يُحفظ داخل `videos.jsonb` عبر `MalaabakAPI.update()`.
- RLS يحمي: بس الأدمن يقدر يعدّل status.

### 4. أزرار الحجز/الانضمام/المراجعات
- بطاقات المباريات/التمارين/الفعاليات: زر "انضم" → `MalaabakAPI.book('match', id)`
- صفحة الملعب/المدرب/الأكاديمية: نموذج مراجعة → `MalaabakAPI.addReview(...)`

### 5. تسجيل الدخول/التسجيل
`login.html` و`register.html` بملعبك عرض فقط. أسهل خيار: استخدام نفس صفحات ساحة (`../login.html`) بعد النقل تحت `saaha/site/malaab/`، فيصير الحساب مشترك تلقائياً.

### 6. النقل تحت ساحة
- انسخ ملعبك إلى `saaha/site/malaab/`.
- احذف `supabase-init.js` من هناك واستبدل الـ`<script>` بـ`<script src="../js/vendor/supabase.js"></script>` و`<script src="../js/supabase-client.js"></script>` (استخدام العميل الرسمي بدل CDN).
- روابط شريط البوابة `#` → `/` و`/tourism/` و`/malaab/`.

### 7. الأول أدمن — خطوة يدوية واحدة
بعد أول تسجيل دخول بحسابك من ساحة، شغّل بـSupabase SQL Editor:
```sql
update profiles set is_admin = true
  where id = (select id from auth.users where email = 'بريدك@example.com');
```

## ⚠️ ملاحظات مهمة
- **العلامة المائية الحقيقية** على الصور/الفيديو تحتاج edge function (ffmpeg على Supabase Edge) — حالياً `watermark_included` مجرد علم بقاعدة البيانات، والعرض overlay بالواجهة.
- **حجم الفيديوهات**: Supabase Storage الافتراضي 50MB/ملف. إذا احتجت أكبر، عدّل `Storage → Settings → File size limit`.
- **الجاذبية للاختبار**: أنشئ حساب من ساحة (`saaha.net/register.html`)، ثم افتح `add-venue.html` بالمعاينة — الـsession مشترك (نفس Supabase URL).
